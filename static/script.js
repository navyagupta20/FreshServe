
const form = document.getElementById("donationForm");
const foodInput = document.getElementById("food");
const quantityInput = document.getElementById("quantity");
const hoursInput = document.getElementById("hoursLeft");
const list = document.getElementById("donationList");
const message = document.getElementById("message");
const count = document.getElementById("count");

const totalDonationsElement = document.getElementById("totalDonations");
const totalMealsElement = document.getElementById("totalMeals");
const urgentDonationsElement = document.getElementById("urgentDonations");

const prioritizeButton = document.getElementById("prioritizeBtn");
const sampleButton = document.getElementById("sampleBtn");

let donations = [];
let editingId = null;

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Request failed.");
    }

    return result;
}

function getUrgency(hoursLeft) {
    if (hoursLeft <= 2) {
        return { label: "Critical", className: "critical" };
    }

    if (hoursLeft <= 3) {
        return { label: "Urgent", className: "urgent" };
    }

    return { label: "Safe", className: "safe" };
}

function updateDashboard() {
    totalDonationsElement.textContent = donations.length;

    const totalMeals = donations.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
    );

    totalMealsElement.textContent = totalMeals.toLocaleString("en-IN");

    urgentDonationsElement.textContent = donations.filter(
        item =>
            item.status === "Available" &&
            Number(item.hoursLeft) <= 3
    ).length;
}

function renderDonations() {
    count.textContent =
        `${donations.length} donation${donations.length === 1 ? "" : "s"}`;

    updateDashboard();
    list.replaceChildren();

    if (!donations.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const title = document.createElement("h3");
        title.textContent = "Your rescue queue starts here";

        const description = document.createElement("p");
        description.textContent =
            "Add a food donation or load demo data to begin.";

        empty.append(title, description);
        list.append(empty);
        return;
    }

    donations.forEach(item => {
        const card = document.createElement("article");
        card.className = "donation";

        const details = document.createElement("div");
        const title = document.createElement("h3");
        const description = document.createElement("p");

        title.textContent = item.food;
        description.textContent = `${item.quantity} meals available`;

        details.append(title, description);

        const status = document.createElement("span");
        status.className = "urgency-badge";

        if (item.status !== "Available") {
            status.classList.add("safe");
            status.textContent = item.status;
        } else {
            const urgency = getUrgency(Number(item.hoursLeft));
            status.classList.add(urgency.className);
            status.textContent = urgency.label;
        }

        const expiry = document.createElement("span");
        expiry.className = "expiry";

        if (Number(item.hoursLeft) === 0) {
            expiry.textContent = "Expires now";
        } else {
            expiry.textContent = `${item.hoursLeft}h left`;
        }

        card.append(details, status, expiry);

        if (item.status === "Available") {
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "edit-btn";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", () => {
                editingId = item.id;
                foodInput.value = item.food;
                quantityInput.value = item.quantity;
                hoursInput.value = item.hoursLeft;

                showMessage(`Editing ${item.food}. Update and submit.`);
                foodInput.focus();
            });

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-btn";
            removeButton.textContent = "Remove";

            removeButton.addEventListener("click", async () => {
                if (!confirm(`Remove ${item.food} donation?`)) return;

                try {
                    await api(`/api/donations/${item.id}`, {
                        method: "DELETE"
                    });

                    await loadDonations();
                    showMessage(`${item.food} donation removed.`);
                } catch (error) {
                    showMessage(error.message, true);
                    await loadDonations();
                }
            });

            card.append(editButton, removeButton);
        } else {
            const booking = document.createElement("p");
            booking.textContent =
                `NGO: ${item.ngoName || "Not specified"}`;

            card.append(booking);
        }

        list.append(card);
    });
}


async function loadDonations() {
    try {
        const result = await api("/api/donations");

        // Show only donations that are still available.
        donations = (result.donations || []).filter(
            item => item.status === "Available"
        );

        renderDonations();
    } catch (error) {
        showMessage(`Could not load donations: ${error.message}`, true);
    }
}


function resetForm() {
    editingId = null;
    form.reset();
    quantityInput.value = 20;
    hoursInput.value = 5;
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const food = foodInput.value.trim().replace(/\s+/g, " ");
    const quantity = Number(quantityInput.value);
    const hoursLeft = Number(hoursInput.value);

    if (!food || food.length > 60 || !/^[a-zA-Z0-9 ]+$/.test(food)) {
        showMessage("Use a valid food name with letters and numbers.", true);
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000) {
        showMessage("Quantity must be between 1 and 100000.", true);
        return;
    }

    if (!Number.isInteger(hoursLeft) || hoursLeft < 0 || hoursLeft > 8760) {
        showMessage("Expiry must be between 0 and 8760 hours.", true);
        return;
    }

    const payload = { food, quantity, hoursLeft };

    try {
        if (editingId !== null) {
            await api(`/api/donations/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            showMessage("Donation updated successfully.");
        } else {
            await api("/api/donations", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            showMessage("Donation added successfully.");
        }

        resetForm();
        await loadDonations();
    } catch (error) {
        showMessage(error.message, true);
    }
});

// Prioritize only available donations.
prioritizeButton.addEventListener("click", async () => {
    const available = donations.filter(
        item => item.status === "Available"
    );

    if (!available.length) {
        showMessage("No available donations to prioritize.", true);
        return;
    }

    prioritizeButton.disabled = true;
    prioritizeButton.textContent = "Prioritizing...";

    try {
        const result = await api("/api/prioritize", {
            method: "POST",
            body: JSON.stringify({ donations: available })
        });

        const orderedIds = (result.donations || []).map(
            item => Number(item.id)
        );

        const positions = new Map(
            orderedIds.map((id, index) => [id, index])
        );

        // Remove claimed and collected donations from this priority view.
        donations = available.sort(
            (a, b) =>
                (positions.get(Number(a.id)) ?? Infinity) -
                (positions.get(Number(b.id)) ?? Infinity)
        );

        renderDonations();
        showMessage("Available donations prioritized successfully.");
    } catch (error) {
        showMessage(error.message, true);
    } finally {
        prioritizeButton.disabled = false;
        prioritizeButton.textContent = "✳ Prioritize donations";
    }
});

// Load demo data only when the database is empty.
sampleButton.addEventListener("click", async () => {
    sampleButton.disabled = true;

    try {
        const result = await api("/api/donations");
        const existingDonations = result.donations || [];

        if (existingDonations.length > 0) {
            showMessage(
                "Demo data was not added because donations already exist. Clear the board first if you want a fresh demo."
            );
            return;
        }

        const samples = [
            { food: "Rice", quantity: 20, hoursLeft: 5 },
            { food: "Bread", quantity: 10, hoursLeft: 2 },
            { food: "Meals", quantity: 15, hoursLeft: 8 }
        ];

        for (const sample of samples) {
            await api("/api/donations", {
                method: "POST",
                body: JSON.stringify(sample)
            });
        }

        await loadDonations();
        showMessage("Demo data loaded successfully!");
    } catch (error) {
        showMessage(error.message, true);
        await loadDonations();
    } finally {
        sampleButton.disabled = false;
    }
});

loadDonations();
