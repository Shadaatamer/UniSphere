const express = require("express");
const Stripe = require("stripe");

const db = require("../data/db");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", express.json(), async (req, res) => {
  try {
    const { amount, studentId, studentName } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid payment amount." });
    }

    if (!studentId) {
      return res.status(400).json({ message: "Missing student ID." });
    }

    const amountNumber = Number(amount);
    const amountInPiastres = Math.round(amountNumber * 100);

    const paymentResult = await db.query(
      `
      INSERT INTO fee_payments (
        student_id,
        amount,
        currency,
        status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING payment_id
      `,
      [studentId, amountNumber, "egp", "pending"],
    );

    const paymentId = paymentResult.rows[0].payment_id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "egp",
            product_data: {
              name: "UniSphere Student Fees",
              description: "Payment for registered semester fees",
            },
            unit_amount: amountInPiastres,
          },
          quantity: 1,
        },
      ],

      metadata: {
        paymentId: String(paymentId),
        studentId: String(studentId),
        source: "unisphere-fees",
      },

      success_url: `${process.env.CLIENT_URL}/student/fees?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/student/fees?payment=cancelled`,
    });

    await db.query(
      `
      UPDATE fee_payments
      SET stripe_session_id = $1
      WHERE payment_id = $2
      `,
      [session.id, paymentId],
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);

    res.status(500).json({
      message: error.message || "Failed to create checkout session.",
    });
  }
});

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    try {
      const signature = req.headers["stripe-signature"];

      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        const paymentId = session.metadata?.paymentId;
        const studentId = session.metadata?.studentId;

        console.log("Stripe payment completed:");
        console.log("Session ID:", session.id);
        console.log("Payment Intent:", session.payment_intent);
        console.log("Payment ID:", paymentId);
        console.log("Student ID:", studentId);

        await db.query(
          `
          UPDATE fee_payments
          SET status = 'paid',
              stripe_payment_intent_id = $1,
              paid_at = NOW()
          WHERE payment_id = $2
            AND student_id = $3
            AND stripe_session_id = $4
          `,
          [session.payment_intent, paymentId, studentId, session.id],
        );

        console.log("Payment marked as paid in database.");
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook handler error:", error);
      res.status(500).json({ message: "Webhook handler failed." });
    }
  },
);

module.exports = router;
