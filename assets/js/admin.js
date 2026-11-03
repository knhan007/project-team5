
/* =========================
   1. STORAGE
========================= */

const STORAGE_KEY = "savorly_submissions";

function loadSub() {
    const storeData = localStorage.getItem(STORAGE_KEY);

    if (storeData === null) {
        return [];
    }

    return JSON.parse(storeData);
}

function saveSub(submissions) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(submissions)
    );
}


/* =========================
   2. HTML ELEMENTS
========================= */

const pendingTable = document.getElementById("pending-recipes-table");
const publishedTable = document.getElementById("published-recipes-table");


/* =========================
   3. ESCAPE HTML
========================= */

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}


/* =========================
   4. RENDER PENDING RECIPES
========================= */

function renderSub() {
    const submissions = loadSub();

    if (!pendingTable) return;

    pendingTable.innerHTML = "";

    const pendingSubmissions = submissions.filter(
        sub => sub.status === "pending"
    );

    if (pendingSubmissions.length === 0) {
        pendingTable.innerHTML = `
            <tr>
                <td colspan="5">No pending recipe requests.</td>
            </tr>
        `;
        return;
    }

    pendingSubmissions.forEach(sub => {
        pendingTable.innerHTML += `
            <tr>
                <td>
                    <div class="table-recipe">
                        <img
                            src="${escapeHtml(sub.image)}"
                            alt="${escapeHtml(sub.title)}"
                        >
                        <div>
                            <strong>${escapeHtml(sub.title)}</strong>
                        </div>
                    </div>
                </td>

                <td>${escapeHtml(sub.submittedBy)}</td>

                <td>${escapeHtml(sub.submittedAt)}</td>

                <td>
                    <span class="status-badge status-pending">
                        Pending
                    </span>
                </td>

                <td>
                    <div class="table-actions">
                        <button
                            class="action-button view-button"
                            type="button"
                            data-action="view"
                            data-id="${escapeHtml(sub.id)}"
                        >
                            View
                        </button>

                        <button
                            class="action-button approve-button"
                            type="button"
                            data-action="approve"
                            data-id="${escapeHtml(sub.id)}"
                            aria-label="Approve recipe"
                        >
                            <i class="fa-solid fa-check"></i>
                        </button>

                        <button
                            class="action-button reject-button"
                            type="button"
                            data-action="reject"
                            data-id="${escapeHtml(sub.id)}"
                            aria-label="Reject recipe"
                        >
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}


/* =========================
   5. RENDER APPROVED RECIPES
========================= */

function renderPublished() {
    const submissions = loadSub();

    if (!publishedTable) return;

    publishedTable.innerHTML = "";

    const approvedSubmissions = submissions.filter(
        sub => sub.status === "approved"
    );

    if (approvedSubmissions.length === 0) {
        publishedTable.innerHTML = `
            <tr>
                <td colspan="5">No approved user recipes yet.</td>
            </tr>
        `;
        return;
    }

    approvedSubmissions.forEach(sub => {
        publishedTable.innerHTML += `
            <tr>
                <td>
                    <div class="table-recipe">
                        <img
                            src="${escapeHtml(sub.image)}"
                            alt="${escapeHtml(sub.title)}"
                        >
                        <div>
                            <strong>${escapeHtml(sub.title)}</strong>
                        </div>
                    </div>
                </td>

                <td>${escapeHtml(sub.submittedBy)}</td>

                <td>${escapeHtml(sub.submittedAt)}</td>

                <td>
                    <span class="status-badge status-approved">
                        Approved
                    </span>
                </td>

                <td>
                    <button
                        class="action-button view-button"
                        type="button"
                        data-action="view"
                        data-id="${escapeHtml(sub.id)}"
                    >
                        View
                    </button>
                </td>
            </tr>
        `;
    });
}


/* =========================
   6. UPDATE DASHBOARD COUNTS
========================= */

function updateDashboard() {
    const submissions = loadSub();

    const pendingCount = submissions.filter(
        sub => sub.status === "pending"
    ).length;

    const approvedCount = submissions.filter(
        sub => sub.status === "approved"
    ).length;

    const rejectedCount = submissions.filter(
        sub => sub.status === "rejected"
    ).length;

    document.getElementById("pending-count").textContent =
        String(pendingCount).padStart(2, "0");

    document.getElementById("approved-count").textContent =
        String(approvedCount).padStart(2, "0");

    document.getElementById("rejected-count").textContent =
        String(rejectedCount).padStart(2, "0");

    const navCount = document.getElementById("pending-nav-count");

    if (navCount) {
        navCount.textContent = pendingCount;
    }
}


/* =========================
   7. APPROVE / REJECT
========================= */

function updateSubmissionStatus(id, newStatus) {
    const submissions = loadSub();

    const submission = submissions.find(
        sub => String(sub.id) === String(id)
    );

    if (!submission) {
        alert("Recipe not found.");
        return;
    }

    submission.status = newStatus;

    saveSub(submissions);

    renderSub();
    renderPublished();
    updateDashboard();
}


/* =========================
   8. TABLE BUTTON EVENTS
========================= */

if (pendingTable) {
    pendingTable.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const recipeId = button.dataset.id;

        if (action === "view") {
            window.location.href =
            `recipe.html?id=${encodeURIComponent(recipeId)}&mode=admin`;
        }

        if (action === "approve") {
            const confirmApprove = confirm(
                "Are you sure you want to approve this recipe?"
            );

            if (confirmApprove) {
                updateSubmissionStatus(recipeId, "approved");
            }
        }

        if (action === "reject") {
            const confirmReject = confirm(
                "Are you sure you want to reject this recipe?"
            );

            if (confirmReject) {
                updateSubmissionStatus(recipeId, "rejected");
            }
        }
    });
}

if (publishedTable) {
    publishedTable.addEventListener("click", function(event) {
        const button = event.target.closest('button[data-action="view"]');

        if (!button) return;

        const recipeId = button.dataset.id;

        window.location.href =
            `recipe.html?id=${encodeURIComponent(recipeId)}&mode=admin`;
    });
}


/* =========================
   9. INITIALIZE ADMIN PAGE
========================= */

renderSub();
renderPublished();
updateDashboard();
