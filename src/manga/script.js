
import "../style/font.css";
import "../style/variables.css";
import "../style/style.css";
import "./manga.css";

import { getList, hasItem, toggleItem } from "../js/storage.js";

console.log("[manga]: LOADED");

const userMenuTrigger = document.getElementById("user-menu-trigger");
const userMenuDropdown = document.getElementById("user-menu-dropdown");
const themeToggleButton = document.querySelector('[data-action="toggle-theme"]');

userMenuTrigger.addEventListener("click", () => {
  const isOpen = userMenuTrigger.getAttribute("aria-expanded") === "true";
  userMenuTrigger.setAttribute("aria-expanded", String(!isOpen));
  userMenuDropdown.hidden = isOpen;
});

themeToggleButton.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("theme", nextTheme);
});

document.addEventListener("click", (event) => {
  if (!document.getElementById("user-menu").contains(event.target)) {
    userMenuTrigger.setAttribute("aria-expanded", "false");
    userMenuDropdown.hidden = true;
  }
});
