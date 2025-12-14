import React, { useState } from "react";
import Card from "../common/Card";
import Button from "../common/Button";

const ComplaintForm = ({ onAdd }) => {
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // basic validation
    if (!date || !message.trim()) return;

    const payload = { date, message: message.trim() };
    if (typeof onAdd === "function") onAdd(payload);
    else console.log("Complaint submitted", payload);

    // reset
    setDate("");
    setMessage("");
  };

  return (
    <Card className="bg-blue-200 p-8 rounded-lg shadow-md">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-800 mb-6">
        Submit Your Complaint
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
            Select Date *
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-blue-500 bg-blue-100 px-4 py-3 pr-10 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700 pointer-events-none">
              {/* <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg> */}
            </div>
          </div>
        </div>

        <div>
          <textarea
            placeholder="Write your complaint *"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-blue-300 bg-blue-100 p-4 text-gray-800 min-h-[84px] focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <Button
            type="submit"
            className="w-full bg-[#0b0936] hover:bg-[#080627] text-white py-3"
          >
            ADD
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ComplaintForm;
