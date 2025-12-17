import React from "react";
import formatTimestamp from "../../../utils/formatTime";

const StatusList = ({ contact, onPreview, theme }) => {
  if (!contact || !contact.statuses || contact.statuses.length === 0) {
    return null;
  }

  const latestStatus = contact.statuses[contact.statuses.length - 1];

  return (
    <div
      onClick={onPreview}
      className={`flex items-center space-x-3 cursor-pointer p-2 rounded-lg
        ${theme === "dark" ? "hover:bg-[#2a3942]" : "hover:bg-gray-100"}
      `}
    >
      {/* Avatar */}
      <div className="relative">
        <img
          src={contact.avatar || "/default-avatar.png"}
          alt={contact.name || "User"}
          className="w-12 h-12 rounded-full object-cover"
        />

        {/* Green ring */}
        <svg className="absolute top-0 left-0 w-12 h-12" viewBox="0 0 100 100">
          {contact.statuses.map((_, index) => {
            const circumference = 2 * Math.PI * 48;
            const segmentLength = circumference / contact.statuses.length;
            const offset = index * segmentLength;

            return (
              <circle
                key={index}
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="#25D366"
                strokeWidth="4"
                strokeDasharray={`${segmentLength - 5} 5`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              />
            );
          })}
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1">
        <p className="font-semibold">{contact.name || "Unknown User"}</p>

        <p
          className={`text-sm ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {formatTimestamp(latestStatus.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default StatusList;
