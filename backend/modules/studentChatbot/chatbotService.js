const chatbotModel = require("./chatbotModel");
const registrationModel = require("../registration/registrationModel");
const registrationService = require("../registration/registrationService");
const { GoogleGenAI } = require("@google/genai");

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gpt-5.2";
// const OPENAI_URL = "https://api.openai.com/v1/responses";
const HISTORY_LIMIT = 12;

function buildStarterPrompts() {
  return [
    "What is my current GPA and course load?",
    "Summarize my registered courses this semester.",
    "Do I have any academic monitoring flags?",
    "What should I check before course registration?",
  ];
}

function extractTextFromResponse(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const parts = [];

  output.forEach((item) => {
    const content = Array.isArray(item?.content) ? item.content : [];
    content.forEach((entry) => {
      if (typeof entry?.text === "string" && entry.text.trim()) {
        parts.push(entry.text.trim());
      }
    });
  });

  return parts.join("\n\n").trim();
}

function buildSystemPrompt(context) {
  return [
    "You are the UniSphere Student AI Assistant.",
    "Your job is to help a student understand their own academic portal data, deadlines, registration state, grades, fees, and general study planning.",
    "Rules:",
    "- Answer in a concise, helpful, friendly tone.",
    "- Only use the provided student context for personal data.",
    "- If the user asks for data not present in context, say that it is not currently available in the portal context.",
    "- Do not invent policies, grades, dates, fees, or approvals.",
    "- Refuse requests to reveal data about other students or private internal data.",
    "- For academic or administrative guidance, prefer actionable next steps.",
    "",
    `Student context JSON:\n${JSON.stringify(context, null, 2)}`,
  ].join("\n");
}

async function buildStudentContext(student, userId) {
  const [
    profile,
    registeredClasses,
    gpa,
    gradeSummary,
    activeFlags,
    announcements,
  ] = await Promise.all([
    chatbotModel.getStudentProfile(student.student_id, userId),
    registrationModel.getRegisteredClasses(student.student_id),
    registrationModel.getStudentGpa(student.student_id),
    chatbotModel.getRecentGradeSummary(student.student_id),
    chatbotModel.getActiveFlagCount(student.student_id),
    chatbotModel.getRecentAnnouncements(),
  ]);

  const latestTermSemester = registeredClasses[0]?.semester;
  const latestTermYear = registeredClasses[0]?.year;
  const loadPolicy = await registrationService.buildLoadPolicySummary(
    student.student_id,
    latestTermSemester,
    latestTermYear,
  );

  return {
    student: {
      id: profile?.student_id || student.student_id,
      fullName: profile?.full_name || null,
      email: profile?.email || null,
      department: profile?.department_name || student.department_name || null,
    },
    academicOverview: {
      cumulativeGpa: Number(gpa?.cumulative_gpa || 0),
      completedCredits: Number(gpa?.completed_credits || 0),
      activeFlagCount: activeFlags,
    },
    registration: {
      currentBand: loadPolicy?.band || "regular",
      maxCredits: Number(loadPolicy?.maxCredits || 0),
      registeredCredits: Number(loadPolicy?.registeredCredits || 0),
      remainingCredits: Number(loadPolicy?.remainingCredits || 0),
      message: loadPolicy?.message || null,
      latestSemester: latestTermSemester || null,
      latestYear: latestTermYear || null,
      registeredClasses: registeredClasses.slice(0, 8).map((item) => ({
        courseCode: item.course_code,
        courseName: item.course_name,
        semester: item.semester,
        year: item.year,
        credits: Number(item.credits || 0),
        section: item.section || null,
        day: item.day || null,
        timeStart: item.time_start || null,
        timeEnd: item.time_end || null,
        location: item.location || null,
      })),
    },
    recentGrades: gradeSummary.map((item) => ({
      courseCode: item.course_code,
      courseName: item.course_name,
      semester: item.semester,
      year: item.year,
      gradedItems: Number(item.graded_items || 0),
      averagePercent: Number(item.avg_percent || 0),
    })),
    announcements: announcements.map((item) => ({
      title: item.title,
      body: item.body,
      createdAt: item.created_at,
    })),
  };
}

function buildLocalFallbackReply(userMessage, context) {
  const text = String(userMessage || "").toLowerCase();

  if (text.includes("gpa")) {
    return `Your current cumulative GPA in the portal is ${Number(context.academicOverview.cumulativeGpa || 0).toFixed(2)}, with ${Number(context.academicOverview.completedCredits || 0)} completed credit hours.`;
  }

  if (
    text.includes("course") ||
    text.includes("registered") ||
    text.includes("enrolled")
  ) {
    if (!context.registration.registeredClasses.length) {
      return "You do not currently have any registered courses listed in the portal context.";
    }

    const list = context.registration.registeredClasses
      .map((item) => `${item.courseCode} ${item.courseName}`)
      .join(", ");

    return `You are currently registered in ${context.registration.registeredClasses.length} course(s): ${list}. Your current registered load is ${context.registration.registeredCredits} credit hours.`;
  }

  if (
    text.includes("flag") ||
    text.includes("academic status") ||
    text.includes("warning")
  ) {
    return context.academicOverview.activeFlagCount > 0
      ? `You currently have ${context.academicOverview.activeFlagCount} active academic monitoring flag(s). You can review them in the Academic Status page.`
      : "You currently have no active academic monitoring flags in the portal.";
  }

  if (text.includes("load") || text.includes("credit")) {
    return `Your current registration band is ${String(context.registration.currentBand || "regular").toUpperCase()}, with a maximum of ${context.registration.maxCredits} credit hours and ${context.registration.remainingCredits} credit hours remaining.`;
  }

  return "The AI provider is not configured yet, so I can only answer a few portal-based questions right now. Once OPENAI_API_KEY is set, I can provide fuller chatbot responses.";
}

// async function generateAssistantReply(history, context) {
//   const apiKey = process.env.OPENAI_API_KEY;
//   if (!apiKey) {
//     return {
//       text: buildLocalFallbackReply(history[history.length - 1]?.content, context),
//       provider: "local-fallback",
//       model: null,
//     };
//   }

//   const input = [
//     {
//       role: "system",
//       content: buildSystemPrompt(context),
//     },
//     ...history.slice(-HISTORY_LIMIT).map((message) => ({
//       role: message.role,
//       content: message.content,
//     })),
//   ];

//   const response = await fetch(OPENAI_URL, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify({
//       model: DEFAULT_MODEL,
//       input,
//     }),
//   });

//   const payload = await response.json();
//   if (!response.ok) {
//     const message = payload?.error?.message || "OpenAI request failed";
//     const err = new Error(message);
//     err.status = 502;
//     throw err;
//   }

//   const text = extractTextFromResponse(payload);
//   if (!text) {
//     const err = new Error("The AI provider returned an empty response");
//     err.status = 502;
//     throw err;
//   }

//   return {
//     text,
//     provider: "openai",
//     model: payload?.model || DEFAULT_MODEL,
//   };
// }
async function generateAssistantReply(history, context) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      text: buildLocalFallbackReply(
        history[history.length - 1]?.content,
        context,
      ),
      provider: "local-fallback",
      model: null,
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const prompt = [
    buildSystemPrompt(context),
    "",
    "Conversation history:",
    ...history.slice(-HISTORY_LIMIT).map((message) => {
      return `${message.role.toUpperCase()}: ${message.content}`;
    }),
    "",
    "Assistant:",
  ].join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  const text = response.text;

  if (!text || !text.trim()) {
    const err = new Error("The AI provider returned an empty response");
    err.status = 502;
    throw err;
  }

  return {
    text: text.trim(),
    provider: "gemini",
    model,
  };
}
async function getChatState(student, userId) {
  const thread = await chatbotModel.getOrCreateThread(student.student_id);
  const messages = await chatbotModel.getMessages(thread.thread_id);

  return {
    thread,
    messages,
    starterPrompts: buildStarterPrompts(),
  };
}

async function sendStudentMessage(student, userId, userMessage) {
  const content = String(userMessage || "").trim();
  if (!content) {
    const err = new Error("Message is required");
    err.status = 400;
    throw err;
  }
  if (content.length > 4000) {
    const err = new Error("Message must be 4000 characters or less");
    err.status = 400;
    throw err;
  }

  const thread = await chatbotModel.getOrCreateThread(student.student_id);
  const userEntry = await chatbotModel.addMessage(
    thread.thread_id,
    "user",
    content,
    "portal",
  );
  const history = await chatbotModel.getMessages(thread.thread_id);
  const context = await buildStudentContext(student, userId);
  let assistantReply;

  try {
    assistantReply = await generateAssistantReply(history, context);
  } catch (err) {
    assistantReply = {
      text: `${buildLocalFallbackReply(content, context)}\n\nThe live AI provider is currently unavailable, so this reply used the portal fallback.`,
      provider: "local-fallback",
      model: null,
    };
  }

  const assistantEntry = await chatbotModel.addMessage(
    thread.thread_id,
    "assistant",
    assistantReply.text,
    assistantReply.provider,
  );

  return {
    thread,
    userMessage: userEntry,
    assistantMessage: {
      ...assistantEntry,
      model: assistantReply.model,
    },
  };
}

async function clearStudentChat(student) {
  const thread = await chatbotModel.getOrCreateThread(student.student_id);
  await chatbotModel.clearMessages(thread.thread_id);
  return {
    message: "Chat cleared",
    thread,
  };
}

module.exports = {
  getChatState,
  sendStudentMessage,
  clearStudentChat,
};
