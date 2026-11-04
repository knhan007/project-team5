/*
   1. RECIPE DATA
*/

let recipes = [];


/*
   2. LOAD RECIPES FROM JSON
*/

function loadRecipes() {
    return fetch("/assets/data/recipe.json")
        .then(function (response) {

            if (!response.ok) {
                throw new Error("Cannot load recipes.json");
            }

            return response.json();
        })
        .then(function (data) {

            recipes = data;

            console.log("Recipes loaded:", recipes);

            return recipes;
        })
        .catch(function (error) {

            console.error("Error loading recipes:", error);

            return [];
        });
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


/* ========================================
   RECIPE DETAIL PAGE - đọc từ recipe.json
   Khớp với id/class trong recipe.html
======================================== */

(function() {

    /* ---------- HÀM PHỤ ---------- */

    // Hiển thị nội dung bằng innerHTML
    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.innerHTML = escapeHtml(value);
        }
    }

    // Xử lý nội dung trước khi đưa vào innerHTML
    function escapeHtml(text) {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Làm tròn số lượng: 1.5, 0.5, 200
    function formatQuantity(quantity) {
        return Number(quantity.toFixed(2));
    }

    // Định dạng nguyên liệu
    // Ví dụ: 200 g Pasta
    function formatIngredient(ingredient, ratio) {

        if (typeof ingredient === "string") {
            return escapeHtml(ingredient);
        }

        const parts = [];

        if (
            ingredient.quantity !== null &&
            ingredient.quantity !== undefined
        ) {
            parts.push(
                formatQuantity(ingredient.quantity * ratio)
            );
        }

        if (ingredient.unit) {
            parts.push(escapeHtml(ingredient.unit));
        }

        parts.push(escapeHtml(ingredient.name));

        return parts.join(" ");
    }


    /* ---------- HIỂN THỊ TỪNG PHẦN ---------- */

    // Danh mục (Italian, Quick...)
    function showCategories(tags) {

        const box = document.getElementById("recipe-categories");

        if (!box) return;

        box.innerHTML = (tags || []).map(tag => `
            <span class="recipe-category">
                ${escapeHtml(tag)}
            </span>
        `).join("");
    }


    // Nguyên liệu (có checkbox, nhân theo số người ăn)
    function showIngredients(ingredients, ratio) {

        const list = document.getElementById("recipe-ingredients");

        if (!list) return;

        list.innerHTML = (ingredients || []).map(ingredient => `
            <li class="ingredient-item">
                <label>
                    <input type="checkbox">
                    <span>
                        ${formatIngredient(ingredient, ratio)}
                    </span>
                </label>
            </li>
        `).join("");
    }


    // Các bước làm (01, 02, 03...)
    function showInstructions(instructions) {

        const box = document.getElementById("recipe-instructions");

        if (!box) return;

        box.innerHTML = (instructions || []).map((step, index) => {

            const number = String(index + 1).padStart(2, "0");

            const title = typeof step === "string"
                ? `Step ${index + 1}`
                : step.title;

            const description = typeof step === "string"
                ? step
                : step.description;

            return `
                <article class="instruction-step">
                    <div class="instruction-step-number">
                        ${number}
                    </div>

                    <div class="instruction-step-content">
                        <h3>${escapeHtml(title)}</h3>
                        <p>${escapeHtml(description)}</p>
                    </div>
                </article>
            `;

        }).join("");
    }


    // Nút tăng/giảm số người ăn
    function setupServings(recipe) {

        const baseServings = Number(recipe.servings) || 1;

        let currentServings = baseServings;

        const decreaseButton =
            document.getElementById("servings-decrease");

        const increaseButton =
            document.getElementById("servings-increase");

        function update() {

            setText("servings-current", currentServings);

            showIngredients(
                recipe.ingredients || [],
                currentServings / baseServings
            );
        }

        if (decreaseButton) {

            decreaseButton.addEventListener("click", function() {

                if (currentServings > 1) {
                    currentServings--;
                    update();
                }

            });
        }

        if (increaseButton) {

            increaseButton.addEventListener("click", function() {

                if (currentServings < 20) {
                    currentServings++;
                    update();
                }

            });
        }

        update();
    }


    // You May Also Like: 3 món khác
    function showRelated(currentRecipe, recipeList) {

        const grid = document.getElementById("related-recipes-grid");

        if (!grid) return;

        const others = recipeList.filter(
            item => item.id !== currentRecipe.id
        );

        const sameType = others.filter(
            item => item.mealType === currentRecipe.mealType
        );

        const differentType = others.filter(
            item => item.mealType !== currentRecipe.mealType
        );

        const related = [
            ...sameType,
            ...differentType
        ].slice(0, 3);

        grid.innerHTML = related.map(item => `
            <article class="related-recipe-card">

                <a
                    href="recipe.html?id=${encodeURIComponent(item.id)}"
                    class="related-recipe-image"
                >
                    <img
                        src="${escapeHtml(item.image || "")}"
                        alt="${escapeHtml(item.title)}"
                        loading="lazy"
                    >
                </a>

                <div class="related-recipe-content">

                    <span class="related-recipe-category">
                        ${escapeHtml(item.mealType || "Recipe")}
                    </span>

                    <h3>
                        <a href="recipe.html?id=${encodeURIComponent(item.id)}">
                            ${escapeHtml(item.title)}
                        </a>
                    </h3>

                    <div class="related-recipe-meta">

                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${getTotalTime(item)} min
                        </span>

                        <span>
                            ${escapeHtml(item.difficulty)}
                        </span>

                    </div>

                </div>

            </article>
        `).join("");
    }


    // Hiện thông báo Recipe Not Found
    function showNotFound() {

        document.querySelectorAll(
            ".recipe-hero, .recipe-overview, .recipe-details, .recipe-tips, .related-recipes"
        ).forEach(section => {
            section.hidden = true;
        });

        const notFound =
            document.getElementById("recipe-not-found");

        if (notFound) {
            notFound.hidden = false;
        }
    }


    /* ---------- ĐỔ DỮ LIỆU 1 MÓN VÀO TRANG ---------- */

    function showRecipe(recipe, recipeList) {

        document.title = `${recipe.title} | Savorly`;

        // Hình ảnh món ăn
        const image = document.getElementById("recipe-image");

        if (image) {
            image.src = recipe.image;
            image.alt = recipe.title;
        }

        // Danh mục
        showCategories(recipe.tags || []);

        // Thông tin món ăn
        setText("recipe-title", recipe.title);
        setText("recipe-description", recipe.description);
        setText(
            "recipe-author",
            recipe.createdBy || "Savorly Kitchen"
        );

        setText("recipe-prep-time", `${recipe.prepTime} min`);
        setText("recipe-cooking-time", `${recipe.cookingTime} min`);
        setText("recipe-total-time", `${getTotalTime(recipe)} min`);
        setText("recipe-difficulty", recipe.difficulty);

        setText(
            "recipe-servings",
            `${recipe.servings} ${recipe.servings === 1 ? "person" : "people"}`
        );

        // Nguyên liệu và số người ăn
        setupServings(recipe);

        // Hướng dẫn nấu ăn
        showInstructions(recipe.instructions || []);

        // Tips: món nào không có thì ẩn cả khối
        const tipsSection =
            document.getElementById("recipe-tips-section");

        if (recipe.tips) {

            setText("recipe-tips", recipe.tips);

        } else if (tipsSection) {

            tipsSection.hidden = true;
        }

        // Món ăn liên quan
        showRelated(recipe, recipeList);
    }


    /* ---------- LẤY ID TRÊN URL, TÌM MÓN TRONG JSON ---------- */

    const id = new URLSearchParams(
        window.location.search
    ).get("id");

    // Tải dữ liệu bằng Promise .then()
    loadRecipes().then(function(recipeList) {

        const recipe = recipeList.find(item =>
            String(item.id) === String(id)
        );

        if (!recipe) {
            showNotFound();
            return;
        }

        showRecipe(recipe, recipeList);

    });

})();
