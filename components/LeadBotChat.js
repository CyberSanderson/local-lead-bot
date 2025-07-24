"use client";

import { useState } from "react";

const questions = [
  { key: "name", question: "What's your name?" },
  { key: "phone", question: "What's your phone number?" },
  { key: "service", question: "What plumbing service do you need?" },
  { key: "time", question: "When do you want us to come?" },
];

export default function LeadBotChat() {
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[currentStep];

  function handleNext() {
    if (!inputValue.trim()) return; // simple validation

    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: inputValue }));
    setInputValue("");
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All questions answered, submit the form
      handleSubmit({ ...answers, [currentQuestion.key]: inputValue });
    }
  }

  async function handleSubmit(data) {
    try {
      const res = await fetch("/api/sendLeadEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert("Failed to send lead info. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("Error sending lead info.");
    }
  }

  if (submitted) {
    return <div>Thanks! Your request has been sent. We will contact you soon.</div>;
  }

  return (
    <div style={{ maxWidth: 400, margin: "auto", fontFamily: "Arial, sans-serif" }}>
      <p><strong>{currentQuestion.question}</strong></p>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleNext()}
        autoFocus
        style={{ width: "100%", padding: 8, fontSize: 16 }}
      />
      <button onClick={handleNext} style={{ marginTop: 10, padding: "8px 16px" }}>
        Next
      </button>
    </div>
  );
}

