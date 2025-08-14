"use client";

import { useState } from "react";

const questions = [
  {
    key: "name",
    question: "What's your name?",
    placeholder: "John Doe",
  },
  {
    key: "phone",
    question: "What's your phone number?",
    placeholder: "e.g. 9175551234",
    helper: "We'll contact you at this number.",
  },
  {
    key: "service",
    question: "What plumbing service do you need?",
    placeholder: "e.g. drain cleaning, faucet repair",
    helper: "Briefly describe the problem or service you want.",
  },
  {
    key: "time",
    question: "When do you want us to come?",
    type: "datetime-local",
    helper: "Pick a preferred date and time.",
  },
];

export default function LeadBotChat() {
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[currentStep];

  const handleNext = () => {
    if (!inputValue.trim()) return;

    const updatedAnswers = {
      ...answers,
      [currentQuestion.key]: inputValue,
    };

    setAnswers(updatedAnswers);
    setInputValue("");

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit(updatedAnswers);
    }
  };

  const handleSubmit = async (data) => {
    setSubmitted(true);

    if (data.time) {
      data.time = new Date(data.time).toISOString();
    }
    
    // --- KEY CHANGE 1: Get the userId from the installation snippet ---
    const userId = window.localLeadBotConfig?.userId;
    if (!userId) {
        alert("Chatbot configuration error: Missing User ID.");
        return;
    }

    // --- KEY CHANGE 2: Add the userId to the data sent to the server ---
    const dataWithUser = { ...data, userId };

    try {
      const res = await fetch("/api/sendLeadEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataWithUser),
      });

      if (!res.ok) {
        alert("Failed to send lead info. Please try again.");
        return;
      }

    } catch (error) {
      console.error(error);
      alert("Error sending lead info.");
    }
  };
  
  // (No changes to the JSX or styling needed)
  const formatDateTime = (value) => {
    if (!value) return "Not provided";
    const date = new Date(value);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (submitted) {
    return (
      <div style={container}>
        <p>{"✅ Thanks! Your request has been sent. We'll contact you shortly."}</p>
        {answers.time && (
          <p>
            📅 <strong>Selected Time:</strong> {formatDateTime(answers.time)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={container}>
      <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>
        {currentQuestion.question}
      </h2>
      <input
        type={currentQuestion.type || "text"}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleNext()}
        autoFocus
        placeholder={currentQuestion.placeholder}
        style={input}
      />
      {currentQuestion.helper && <p style={helper}>{currentQuestion.helper}</p>}
      <button onClick={handleNext} style={button} disabled={!inputValue.trim()}>
        Next
      </button>
    </div>
  );
}

// (Styling objects remain the same)
const container = { maxWidth: 400, margin: "auto", padding: 20, fontFamily: "Arial, sans-serif", border: "1px solid #ccc", borderRadius: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.1)",};
const input = { width: "100%", padding: "10px", fontSize: "16px", marginBottom: "8px", borderRadius: "5px", border: "1px solid #ccc",};
const button = { padding: "10px 20px", fontSize: "16px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer",};
const helper = { fontSize: "12px", color: "#666", marginBottom: "12px",};

