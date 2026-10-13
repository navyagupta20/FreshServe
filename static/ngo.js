
const board = document.getElementById("ngoDonations");
const message = document.getElementById("ngoMessage");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

let donations = [];

async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed.");
    }

    return data;
}

function notify(text, error = false) {
    message.textContent = text;
    message.style.color = error ? "#b91c1c" : "#286b45";
}

async function loadDonations() {
    board.textContent = "Loading donations...";

    try {
        const result = await api("/api/donations");
        donations = result.donations || [];

        document.getElementById("availableCount").textContent =
            donations.filter(d => d.status === "Available").length;

        document.getElementById("claimedCount").textContent =
            donations.filter(d => d.status === "Claimed").length;

        document.getElementById("collectedMeals").textContent =
            donations
                .filter(d => d.status === "Collected")
                .reduce((sum, d) => sum + Number(d.quantity), 0);

        renderBoard();
    } catch (error) {
        board.textContent = "Could not load donations. Please refresh the page.";
        notify(error.message, true);
    }
}

function renderBoard() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = statusFilter.value;

    const filtered = donations.filter(d =>
        d.food.toLowerCase().includes(query) &&
        (filter === "All" || d.status === filter)
    );

    board.replaceChildren();

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = donations.length
            ? "No donations match this filter."
            : "No donations yet. Add one from the Donor Dashboard.";
        board.append(empty);
        return;
    }

    filtered.forEach(d => {
        const card = document.createElement("article");
        card.className = "ngo-card";

        const title = document.createElement("h3");
        title.textContent = d.food;

        const status = document.createElement("span");
        status.className = "ngo-status " + d.status.toLowerCase();
        status.textContent = d.status;

        const details = document.createElement("p");
        details.textContent =
            `${d.quantity} meals · ${d.hoursLeft} hours until expiry`;

        card.append(title, status, details);

        if (d.status !== "Available") {
            const booking = document.createElement("p");
            booking.textContent =
                `NGO: ${d.ngoName || "Not specified"} | Pickup: ${d.pickupLocation || "Not specified"} | Time: ${d.pickupTime || "Not specified"}`;
            card.append(booking);
        }

        if (d.status === "Available") {
            const form = document.createElement("form");
            form.className = "ngo-form";

            const ngo = document.createElement("input");
            ngo.placeholder = "NGO name";
            ngo.required = true;

            const location = document.createElement("input");
            location.placeholder = "Pickup location";
            location.required = true;

            const time = document.createElement("input");
            time.placeholder = "Pickup time";
            time.required = true;

            const button = document.createElement("button");
            button.className = "claim-btn";
            button.textContent = "Claim Donation";
            button.type = "submit";

            form.append(ngo, location, time, button);

            form.addEventListener("submit", async event => {
                event.preventDefault();
                button.disabled = true;

                try {
                    await api(`/api/donations/${d.id}/claim`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ngoName: ngo.value.trim(),
                            pickupLocation: location.value.trim(),
                            pickupTime: time.value.trim()
                        })
                    });

                    notify("Donation claimed successfully!");
                    await loadDonations();
                } catch (error) {
                    notify(error.message, true);
                    button.disabled = false;
                }
            });

            card.append(form);
        }

        if (d.status === "Claimed") {
            const button = document.createElement("button");
            button.className = "collected-btn";
            button.textContent = "Mark as Collected";

            button.addEventListener("click", async () => {
                button.disabled = true;

                try {
                    await api(`/api/donations/${d.id}/status`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "Collected" })
                    });

                    notify("Donation marked as collected!");
                    await loadDonations();
                } catch (error) {
                    notify(error.message, true);
                    button.disabled = false;
                }
            });

            card.append(button);
        }

        board.append(card);
    });
}

searchInput.addEventListener("input", renderBoard);
statusFilter.addEventListener("change", renderBoard);
document.getElementById("refreshBtn").addEventListener("click", loadDonations);

loadDonations();
