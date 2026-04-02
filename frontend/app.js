let allItems = [];
let adminMode = false;
const ADMIN_PASSWORD = "pfwadmin";

const lostItemForm = document.getElementById("lostItemForm");
const locationSelect = document.getElementById("location");
const otherLocationGroup = document.getElementById("otherLocationGroup");
const otherLocationInput = document.getElementById("otherLocation");
const messageBox = document.getElementById("message");
const searchInput = document.getElementById("searchInput");
const itemsList = document.getElementById("itemsList");
const adminToggleBtn = document.getElementById("adminToggleBtn");
const adminStatus = document.getElementById("adminStatus");

locationSelect.addEventListener("change", () => {
  if (locationSelect.value === "Other") {
    otherLocationGroup.classList.remove("hidden");
  } else {
    otherLocationGroup.classList.add("hidden");
    otherLocationInput.value = "";
  }
});

lostItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  let location = locationSelect.value;
  if (location === "Other") {
    location = otherLocationInput.value.trim();
  }

  if (!location) {
    showMessage("Please enter a valid location.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("itemType", document.getElementById("itemType").value.trim());
  formData.append("color", document.getElementById("color").value.trim());
  formData.append("description", document.getElementById("description").value.trim());
  formData.append("location", location);
  formData.append("date", document.getElementById("date").value);
  formData.append("time", document.getElementById("time").value);
  formData.append("name", document.getElementById("name").value.trim());
  formData.append("email", document.getElementById("email").value.trim());
  formData.append("phone", document.getElementById("phone").value.trim());
  formData.append("affiliation", document.getElementById("affiliation").value);

  const imageFile = document.getElementById("image").files[0];
  if (imageFile) {
    formData.append("image", imageFile);
  }

  try {
    const response = await fetch("/items", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      showMessage(result.error || "Unable to submit report.", "error");
      return;
    }

    showMessage(result.message || "Lost item report submitted successfully.", "success");
    lostItemForm.reset();
    otherLocationGroup.classList.add("hidden");
    await loadItems();
  } catch (error) {
    console.error("Submit error:", error);
    showMessage("Error submitting report. Please try again.", "error");
  }
});

adminToggleBtn.addEventListener("click", () => {
  if (!adminMode) {
    const enteredPassword = prompt("Enter admin password:");
    if (enteredPassword === ADMIN_PASSWORD) {
      adminMode = true;
      adminToggleBtn.textContent = "Disable Admin Mode";
      adminStatus.textContent = "Admin Mode: ON";
      loadItems();
    } else if (enteredPassword !== null) {
      showMessage("Incorrect admin password.", "error");
    }
  } else {
    adminMode = false;
    adminToggleBtn.textContent = "Enable Admin Mode";
    adminStatus.textContent = "Admin Mode: OFF";
    loadItems();
  }
});

searchInput.addEventListener("input", () => {
  applyCurrentSearch();
});

async function loadItems() {
  try {
    const response = await fetch("/items");
    const items = await response.json();
    allItems = items;
    applyCurrentSearch();
  } catch (error) {
    console.error("Load items error:", error);
    itemsList.innerHTML = `<p class="empty-state">Error loading items.</p>`;
  }
}

function applyCurrentSearch() {
  const search = searchInput.value.toLowerCase().trim();

  const filtered = allItems.filter((item) =>
    item.itemType.toLowerCase().includes(search) ||
    item.color.toLowerCase().includes(search) ||
    item.location.toLowerCase().includes(search)
  );

  displayItems(filtered);
}

function displayItems(items) {
  itemsList.innerHTML = "";

  if (!items.length) {
    itemsList.innerHTML = `<p class="empty-state">No lost items found.</p>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";

    const imageHtml = item.image
      ? `<img src="${item.image}" alt="Lost item image" class="item-image" />`
      : "";

    const adminContactHtml = adminMode
      ? `
        <div class="admin-contact-box">
          <h4>Admin Contact Details</h4>
          <p><strong>Reporter:</strong> ${escapeHtml(item.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(item.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(item.phone)}</p>
          <p><strong>Affiliation:</strong> ${escapeHtml(item.affiliation)}</p>
        </div>
      `
      : "";

    card.innerHTML = `
      <h3>${escapeHtml(item.itemType)} - ${escapeHtml(item.color)}</h3>
      <p><strong>Location:</strong> ${escapeHtml(item.location)}</p>
      <p><strong>Date:</strong> ${escapeHtml(item.date)}</p>
      <p><strong>Time:</strong> ${escapeHtml(item.time)}</p>
      <p><strong>Description:</strong> ${escapeHtml(item.description || "No description provided.")}</p>
      ${imageHtml}
      <p><strong>Status:</strong>
        <span class="${item.status === "Open" ? "status-open" : "status-returned"}">
          ${escapeHtml(item.status)}
        </span>
      </p>
      ${adminContactHtml}
      ${
        adminMode && item.status === "Open"
          ? `<button class="return-btn" data-id="${item.id}">Mark Returned</button>`
          : ""
      }
    `;

    itemsList.appendChild(card);
  });

  document.querySelectorAll(".return-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const itemId = button.getAttribute("data-id");
      await markReturned(itemId);
    });
  });
}

async function markReturned(id) {
  clearMessage();

  try {
    const response = await fetch(`/items/${id}/return`, {
      method: "PUT"
    });

    if (!response.ok) {
      showMessage("Could not update item status.", "error");
      return;
    }

    showMessage("Item marked as returned.", "success");
    await loadItems();
  } catch (error) {
    console.error("Mark returned error:", error);
    showMessage("Error updating item status.", "error");
  }
}

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

loadItems();