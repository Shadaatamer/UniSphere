const express = require("express");
const router = express.Router();

router.post("/predict-risk", async (req, res) => {
  try {
    const payload = req.body;

    const response = await fetch("http://localhost:5001/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error) {
    console.error("Prediction route error:", error);
    return res.status(500).json({ error: "Failed to connect to AI service" });
  }
});

module.exports = router;
