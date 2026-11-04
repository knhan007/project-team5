/*
   1. RECIPE DATA
*/

let recipes = [];


/*
   2. LOAD RECIPES FROM JSON
*/

async function loadRecipes() {
    try {
        const response = await fetch("../assets/data/recipe.json");

        if (!response.ok) {
            throw new Error("Cannot load recipes.json");
        }

        recipes = await response.json();

        console.log("Recipes loaded:", recipes);

        return recipes;
    } catch (error) {
        console.error("Error loading recipes:", error);
        return [];
    }
}


/*
   3. GET RECIPE BY ID
*/

function getRecipeById(id) {
    return recipes.find(recipe => recipe.id === id);
}


/*
   4. GET TOTAL COOKING TIME
*/

function getTotalTime(recipe) {
    return recipe.prepTime + recipe.cookingTime;
}

const SUBMISSION_STORAGE_KEY = "savorly_submissions";

function loadSubmissions() {
    const data = localStorage.getItem(SUBMISSION_STORAGE_KEY);

    return data === null ? [] : JSON.parse(data);
}
function saveSubmissions(submissions) {
    localStorage.setItem(
        SUBMISSION_STORAGE_KEY,
        JSON.stringify(submissions)
    );
}

function getSubmissionById(id) {
    const submissions = loadSubmissions();

    return submissions.find(
        sub => String(sub.id) === String(id)
    );
}

function getRecipeAuthorName(recipe) {
    const author = recipe.submittedByName || recipe.submittedBy || recipe.createdBy;

    try {
        const accounts = JSON.parse(localStorage.getItem("user.json") || "[]");
        let account = accounts.find(function (item) {
            return (recipe.submittedById && item.id === recipe.submittedById) ||
                item.id === author ||
                (item.email && author &&
                    item.email.toLowerCase() === String(author).toLowerCase());
        });

        const legacyId = /^user[_-](\d+)$/i.exec(String(recipe.submittedById || author || ""));
        if (!account && legacyId) {
            const matchingUsers = accounts.filter(function (item) {
                const accountNumber = /(?:^|[-_])(\d+)$/i.exec(String(item.id || ""));
                return item.role === "user" && accountNumber &&
                    accountNumber[1] === legacyId[1];
            });
            if (matchingUsers.length === 1) account = matchingUsers[0];
        }

        if (account && account.name) {
            const updates = {
                submittedById: account.id,
                submittedByName: account.name,
                submittedBy: account.name
            };
            Object.assign(recipe, updates);

            const submissions = loadSubmissions();
            const savedRecipe = submissions.find(function (item) {
                return String(item.id) === String(recipe.id);
            });
            if (savedRecipe && (savedRecipe.submittedById !== account.id ||
                savedRecipe.submittedByName !== account.name ||
                savedRecipe.submittedBy !== account.name)) {
                Object.assign(savedRecipe, updates);
                saveSubmissions(submissions);
            }

            return account.name;
        }

        if (legacyId) return "Người dùng";
    } catch (error) {
        // Fall back to the recipe's saved author label if account data is unavailable.
    }

    return author || "Savorly Kitchen";
}
/* 
   RECIPE DETAIL PAGE - đọc từ recipe.json
   Khớp với id/class trong recipe.html
 */

(async function() {

    /* ---------- Hàm phụ ---------- */

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Làm tròn số lượng: 1.5, 0.5, 200
    function formatQuantity(quantity) {
        return Number(quantity.toFixed(2));
    }

    // {name:"Pasta", quantity:200, unit:"g"} → "200 g Pasta"
    // quantity = null (muối tiêu) → chỉ hiện tên
    function formatIngredient(ingredient, ratio) {

        if (typeof ingredient === "string") return ingredient;

        const parts = [];

        if (ingredient.quantity !== null && ingredient.quantity !== undefined) {
            parts.push(formatQuantity(ingredient.quantity * ratio));
        }
        if (ingredient.unit) {
            parts.push(ingredient.unit);
        }
        parts.push(ingredient.name);

        return parts.join(" ");
    }


    /* ---------- Hiển thị từng phần ---------- */

    // Danh mục (Italian, Quick...)
    function showCategories(tags) {
        const box = document.getElementById("recipe-categories");
        if (!box) return;
        box.innerHTML = "";

        tags.forEach(tag => {
            const span = document.createElement("span");
            span.className = "recipe-category";
            span.textContent = tag;
            box.appendChild(span);
        });
    }

    // Nguyên liệu (có checkbox, nhân theo số người ăn)
    function showIngredients(ingredients, ratio) {
        const list = document.getElementById("recipe-ingredients");
        if (!list) return;
        list.innerHTML = "";

        ingredients.forEach(ingredient => {
            const li = document.createElement("li");
            li.className = "ingredient-item";

            const label = document.createElement("label");

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";

            const span = document.createElement("span");
            span.textContent = formatIngredient(ingredient, ratio);

            label.appendChild(checkbox);
            label.appendChild(span);
            li.appendChild(label);
            list.appendChild(li);
        });
    }

    // Các bước làm (01, 02, 03...)
    function showInstructions(instructions) {
        const box = document.getElementById("recipe-instructions");
        if (!box) return;

        box.innerHTML = instructions.map((step, index) => {

            const number = String(index + 1).padStart(2, "0");
            const title = typeof step === "string" ? `Step ${index + 1}` : step.title;
            const description = typeof step === "string" ? step : step.description;

            return `
                <article class="instruction-step">
                    <div class="instruction-step-number">${number}</div>
                    <div class="instruction-step-content">
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(description)}</p>
                    </div>
                </article>
            `;
        }).join("");
    }

    // Nút tăng/giảm số người ăn → nguyên liệu tự nhân theo
    function setupServings(recipe) {

        const baseServings = Number(recipe.servings) || 1;
        let currentServings = baseServings;

        const decreaseButton = document.getElementById("servings-decrease");
        const increaseButton = document.getElementById("servings-increase");

        function update() {
            setText("servings-current", currentServings);
            showIngredients(recipe.ingredients || [], currentServings / baseServings);
        }

        if (decreaseButton) {
            decreaseButton.addEventListener("click", () => {
                if (currentServings > 1) {
                    currentServings--;
                    update();
                }
            });
        }

        if (increaseButton) {
            increaseButton.addEventListener("click", () => {
                if (currentServings < 20) {
                    currentServings++;
                    update();
                }
            });
        }

        update();
    }

    // "You May Also Like": 3 món khác, ưu tiên cùng loại bữa ăn
    function showRelated(currentRecipe, recipeList) {

        const grid = document.getElementById("related-recipes-grid");
        if (!grid) return;

        const others = recipeList.filter(item => item.id !== currentRecipe.id);

        const sameType = others.filter(item => item.mealType === currentRecipe.mealType);
        const differentType = others.filter(item => item.mealType !== currentRecipe.mealType);

        const related = [...sameType, ...differentType].slice(0, 3);

        grid.innerHTML = related.map(item => `
            <article class="related-recipe-card">

                <a href="recipe.html?id=${item.id}" class="related-recipe-image">
                    <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy">
                </a>

                <div class="related-recipe-content">

                    <span class="related-recipe-category">
                        ${escapeHtml(item.mealType || "Recipe")}
                    </span>

                    <h3>
                        <a href="recipe.html?id=${item.id}">
                            ${escapeHtml(item.title)}
                        </a>
                    </h3>

                    <div class="related-recipe-meta">
                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${getTotalTime(item)} min
                        </span>
                        <span>${escapeHtml(item.difficulty)}</span>
                    </div>

                </div>

            </article>
        `).join("");
    }

    // Hiện thông báo "Recipe Not Found", ẩn các phần còn lại
    function showNotFound() {
        document.querySelectorAll(
            ".recipe-hero, .recipe-overview, .recipe-details, .recipe-tips, .related-recipes"
        ).forEach(section => {
            section.hidden = true;
        });

        const notFound = document.getElementById("recipe-not-found");
        if (notFound) notFound.hidden = false;
    }


    /* ---------- Đổ dữ liệu 1 món vào trang ---------- */
    function showRecipe(recipe, recipeList, isAdminReview = false) {
        document.title = `${recipe.title} | Savorly`;
            // Admin Review Mode
        const heroActions = document.getElementById("recipe-hero-actions");
        const adminActions = document.getElementById("admin-review-actions");
        const relatedSection = document.querySelector(".related-recipes");

        if (isAdminReview) {
            if (heroActions) heroActions.hidden = true;
            if (adminActions) adminActions.hidden = false;
            if (relatedSection) relatedSection.hidden = true;
        } else {
            if (heroActions) heroActions.hidden = false;
            if (adminActions) adminActions.hidden = true;
            if (relatedSection) relatedSection.hidden = false;
        }
        const image = document.getElementById("recipe-image");
        if (image) {
            image.src = recipe.image;
            image.alt = recipe.title;
        }

        showCategories(recipe.tags || []);

        setText("recipe-title", recipe.title);
        setText("recipe-description", recipe.description);
        setText("recipe-author", getRecipeAuthorName(recipe));

        setText("recipe-prep-time", `${recipe.prepTime} min`);
        setText("recipe-cooking-time", `${recipe.cookingTime} min`);
        setText("recipe-total-time", `${getTotalTime(recipe)} min`);
        setText("recipe-difficulty", recipe.difficulty);
        setText(
            "recipe-servings",
            `${recipe.servings} ${recipe.servings === 1 ? "person" : "people"}`
        );

        setupServings(recipe);
        showInstructions(recipe.instructions || []);

        // Tips: món nào không có thì ẩn cả khối
        const tipsSection = document.getElementById("recipe-tips-section");
        if (recipe.tips) {
            setText("recipe-tips", recipe.tips);
        } else if (tipsSection) {
            tipsSection.hidden = true;
        }

        showRelated(recipe, recipeList);
    }

    function handleAdminReview(id) {
    const approveButton = document.getElementById("approve-recipe");
    const rejectButton = document.getElementById("reject-recipe");

    function updateStatus(newStatus) {
        const submissions = loadSubmissions();

        const recipe = submissions.find(
            item => String(item.id) === String(id)
        );

        if (!recipe) {
            alert("Recipe not found!");
            return;
        }

        recipe.status = newStatus;

        saveSubmissions(submissions);

        alert(`Recipe ${newStatus} successfully!`);

        window.location.href = "admin.html";
    }

    if (approveButton) {
        approveButton.addEventListener("click", function() {
            const confirmApprove = confirm(
                "Are you sure you want to approve this recipe?"
            );

            if (confirmApprove) {
                updateStatus("approved");
            }
        });
    }

    if (rejectButton) {
        rejectButton.addEventListener("click", function() {
            const confirmReject = confirm(
                "Are you sure you want to reject this recipe?"
            );

            if (confirmReject) {
                updateStatus("rejected");
            }
        });
    }
}

/* ---------- Determine page mode ---------- */

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const mode = params.get("mode");

const isAdminReview = mode === "admin";
const isUserView = mode === "user";

const backButton = document.getElementById("back-to-admin");

if (backButton) {
    backButton.hidden = !isAdminReview;
}

if (isAdminReview) {
    const breadcrumb = document.getElementById("recipe-breadcrumb");
    const footer = document.querySelector(".footer");
    const backButton = document.getElementById("back-to-admin");

    if (breadcrumb) breadcrumb.style.display = "none";
    if (footer) footer.style.display = "none";
    if (backButton) backButton.hidden = false;
}

let recipeList = [];
let recipe = null;


/* ---------- Load recipe data ---------- */

if (isAdminReview || isUserView) {

    // Admin / User: lấy recipe từ localStorage
    recipe = getSubmissionById(id);

    if (recipe) {
        recipeList = [recipe];
    }

} else {
    // Explore: lấy recipe có sẵn từ JSON
    const staticRecipes = await loadRecipes();

    // Approved recipes do user tạo
    const approvedUserRecipes = loadSubmissions().filter(
        item => item.status === "approved"
    );

    // Gộp dữ liệu để Related Recipes có thể sử dụng
    recipeList = [
        ...staticRecipes,
        ...approvedUserRecipes
    ];

    // Tìm món trong cả JSON và localStorage
    recipe = recipeList.find(
        item => String(item.id) === String(id)
    );
}


/* ---------- Display recipe ---------- */

if (!recipe) {

    showNotFound();
    return;

}

showRecipe(recipe, recipeList, isAdminReview);
if (isAdminReview) {
    handleAdminReview(id);
}

// User xem món của mình thì không cần related recipes
if (isUserView) {
    const relatedSection = document.querySelector(".related-recipes");

    if (relatedSection) {
        relatedSection.hidden = true;
    }
}
})();
