document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const template = document.getElementById("activity-template");

  // Function to fetch activities from API and render using the template
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and existing content
      activitiesList.innerHTML = "";

      // Clear existing select options (keep the placeholder)
      Array.from(activitySelect.options)
        .filter(opt => opt.value !== "")
        .forEach(opt => opt.remove());

      // If API returns an object (older shape), normalize to array
      const activityArray = Array.isArray(activities)
        ? activities
        : Object.entries(activities || {}).map(([name, details]) => ({ name, ...details }));

      // Populate activities using template
      activityArray.forEach(activity => {
        const name = activity.name || activity.title || "Unnamed Activity";
        const participants = activity.participants || [];
        const used = participants.length;
        const max = activity.max_participants ?? activity.maxParticipants ?? 0;

        const clone = template.content.cloneNode(true);
        const article = clone.querySelector(".activity-card");
        if (article) article.dataset.activityName = name;

        const titleEl = clone.querySelector(".activity-title");
        if (titleEl) titleEl.textContent = name;

        const descEl = clone.querySelector(".activity-desc");
        if (descEl) descEl.textContent = activity.description || "";

        const scheduleEl = clone.querySelector(".activity-schedule");
        if (scheduleEl) scheduleEl.innerHTML = `<strong>Schedule:</strong> ${activity.schedule || ""}`;

        const usedEl = clone.querySelector(".capacity-used");
        if (usedEl) usedEl.textContent = used;

        const maxEl = clone.querySelector(".capacity-max");
        if (maxEl) maxEl.textContent = max;

        const countEl = clone.querySelector(".participants-count");
        if (countEl) countEl.textContent = used;

        const listEl = clone.querySelector(".participants-list");
        if (listEl) {
          listEl.innerHTML = "";
          if (participants.length) {
            participants.forEach(p => {
              const li = document.createElement("li");
              const a = document.createElement("a");
              a.href = `mailto:${p}`;
              a.textContent = p;

              // Remove button (delete icon)
              const btn = document.createElement("button");
              btn.type = "button";
              btn.className = "remove-participant";
              btn.setAttribute("aria-label", `Remove ${p}`);
              btn.dataset.email = p;
              btn.textContent = "×";

              li.appendChild(a);
              li.appendChild(btn);
              listEl.appendChild(li);
            });
          } else {
            const li = document.createElement("li");
            li.textContent = "No participants yet";
            listEl.appendChild(li);
          }
        }

        activitiesList.appendChild(clone);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      if (activityArray.length === 0) {
        activitiesList.innerHTML = "<p>No activities available.</p>";
      }
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // Keep the base 'message' class and toggle status classes
        messageDiv.classList.remove("error", "info", "success");
        messageDiv.classList.add("message", "success");
        signupForm.reset();

        // Refresh activities so participants list is updated
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.classList.remove("error", "info", "success");
        messageDiv.classList.add("message", "error");
      }

  messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.classList.remove("error", "info", "success");
      messageDiv.classList.add("message", "error");
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event delegation: handle clicks on remove buttons inside activitiesList
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".remove-participant");
    if (!btn) return;

    const li = btn.closest("li");
    const email = btn.dataset.email;
    const card = btn.closest(".activity-card");
    const activityName = card ? card.dataset.activityName : null;

    if (!activityName || !email) return;

    // Confirm removal
    if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        // Show success message briefly; preserve base message class
        messageDiv.textContent = result.message || `${email} removed from ${activityName}`;
        messageDiv.classList.remove("error", "info", "success");
        messageDiv.classList.add("message", "success");
        messageDiv.classList.remove("hidden");

        // Refresh activities to reflect change
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Failed to remove participant";
        messageDiv.classList.remove("error", "info", "success");
        messageDiv.classList.add("message", "error");
        messageDiv.classList.remove("hidden");
      }

      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
    } catch (err) {
      console.error("Error removing participant:", err);
      messageDiv.textContent = "Failed to remove participant. Try again.";
      messageDiv.classList.remove("error", "info", "success");
      messageDiv.classList.add("message", "error");
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
    }
  });

  // Initialize app
  fetchActivities();
});
