/**
 * User Profile dropdown component
 * Displays user avatar and provides account/logout options
 */

import React, { useState } from "react";
import { useAuth } from "./AuthProvider";
import { WEBSITE_URL } from "../services/web-auth";

export const UserProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };

  const handleAccountClick = () => {
    setShowDropdown(false);
    chrome.tabs.create({ url: `${WEBSITE_URL}/settings/credits` });
  };

  return (
    <div className="relative">
      {/* User Avatar Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800 transition-all"
        title={user.name || user.email}
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || user.email}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white text-xs font-semibold">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* User Info */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user.name || user.email.split("@")[0]}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </div>
          </div>

          {/* Account Button */}
          <button
            onClick={handleAccountClick}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
          >
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Account
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
          >
            <svg
              className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign Out
          </button>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default UserProfile;
