
const form = document.getElementById("donationForm");
const foodInput = document.getElementById("food");
const quantityInput = document.getElementById("quantity");
const hoursInput = document.getElementById("hoursLeft");
const list = document.getElementById("donationList");
const message = document.getElementById("message");
const count = document.getElementById("count");

let donations = [];
let nextId = 1;

function renderDonations(items = donations) {
    count.textContent = `${items.length} donation${items.length === 1 ? "" : "s"}`;

    if (!items.length) {
        list.innerHTML = '<p class="empty">No donations yet. Add one above to begin.</p>';
        return;
    }

    list.replaceChildren();

    items.forEach((item) => {
        const card = document.createElement("article");
        card.className = "donation";

        const details = document.createElement("div");
        const title = document.createElement("h3");
        const description = document.createElement("p");
        const expiry = document.createElement("span");

        title.textContent = item.food;
        description.textContent = `${item.quantity} meals available`;
        expiry.className = "expiry";
        expiry.textContent = item.hoursLeft === 0
            ? "Expires now"
            : `${item.hoursLeft}h left`;

        details.append(title, description);
        card.append(details, expiry);
        list.append(card);
    });
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const food = foodInput.value.trim();
    const quantity = Number(quantityInput.value);
    const hoursLeft = Number(hoursInput.value);

    if (!food || !Number.isInteger(quantity) || quantity < 1 ||
        !Number.isInteger(hoursLeft) || hoursLeft < 0 || hoursLeft > 8760) {
        message.textContent = "Enter a valid food name, quantity and expiry time.";
        return;
    }

    donations.push({ id: nextId++, food, quantity, hoursLeft });
    renderDonations();
    form.reset();
    quantityInput.value = 20;
    hoursInput.value = 5;
    message.textContent = "Donation added successfully.";
});

document.getElementById("prioritizeBtn").addEventListener("click", async () => {
    if (!donations.length) {
        message.textContent = "Add a donation first.";
        return;
    }

    message.textContent = "Calculating priority using the C++ engine...";

    try {
        const response = await fetch("/api/prioritize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ donations })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Could not prioritize donations.");

        donations = result.donations.map(item => ({
            ...item,
            id: item.id
        }));

        renderDonations();
        message.textContent = "Donations prioritized by earliest expiry using C++.";
    } catch (error) {
        message.textContent = error.message || "Could not connect to the server.";
    }
});

document.getElementById("sampleBtn").addEventListener("click", () => {
    donations = [
        { id: nextId++, food: "Rice", quantity: 20, hoursLeft: 5 },
        { id: nextId++, food: "Bread", quantity: 10, hoursLeft: 2 },
        { id: nextId++, food: "Meals", quantity: 15, hoursLeft: 8 }
    ];

    renderDonations();
    message.textContent = "Sample donations loaded. Click Prioritize donations to test C++.";
});

renderDonations();
