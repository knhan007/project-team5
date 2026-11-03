const recipeGrid = document.getElementById("explore-recipe-grid");
const recipeCount = document.getElementById("recipe-count");
const noRecipes = document.getElementById("no-recipes");

const searchForm = document.querySelector(".explore-search");
const searchInput = document.getElementById("recipe-search");
const categoryFilter = document.getElementById("category-filter");
const timeFilter = document.getElementById("time-filter");
const difficultyFilter = document.getElementById("difficulty-filter");
const resetFiltersBtn = document.getElementById("reset-filters");

let allRecipes = [];

// Khóa bản sao dữ liệu để tránh vô tình sửa dữ liệu trong lúc lọc.
function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }

    return value;
}

function normalize(value) {
    return String(value ?? "").trim().toLocaleLowerCase();
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function getTotalTime(recipe) {
    return (Number(recipe.prepTime) || 0) +
           (Number(recipe.cookingTime) || 0);
}

// Tìm trong tên, mô tả, danh mục, tags và tên nguyên liệu.
function getSearchableText(recipe) {
    const tags = Array.isArray(recipe.tags) ? recipe.tags : [];
    const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map(item => item?.name)
        : [];

    return [
        recipe.title,
        recipe.description,
        recipe.mealType,
        ...tags,
        ...ingredients
    ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
}

function createRecipeCard(recipe) {
    const id = String(recipe.id ?? "");
    const encodedId = encodeURIComponent(id);
    const title = escapeHtml(recipe.title);
    const image = escapeHtml(recipe.image);
    const description = escapeHtml(recipe.description);
    const category = escapeHtml(recipe.mealType || "Recipe");
    const difficulty = escapeHtml(recipe.difficulty || "Not specified");
    const totalTime = getTotalTime(recipe);

    return `
        <article class="explore-recipe-card" data-recipe-id="${escapeHtml(id)}">
            <a href="recipe.html?id=${encodedId}" class="explore-recipe-image">
                <img src="${image}" alt="${title}" loading="lazy">
            </a>

            <div class="explore-recipe-info">
                <span class="recipe-category">${category}</span>

                <h3>
                    <a href="recipe.html?id=${encodedId}">${title}</a>
                </h3>

                <p>${description}</p>

                <div class="explore-recipe-meta">
                    <span>
                        <i class="fa-regular fa-clock"></i>
                        ${totalTime} min
                    </span>
                    <span>${difficulty}</span>
                </div>

                <a
                    href="recipe.html?id=${encodedId}"
                    class="button button-outline recipe-view-button">
                    View Recipe
                </a>
            </div>
        </article>
    `;
}

function renderRecipes(recipeList) {
    recipeGrid.innerHTML = recipeList
        .map(createRecipeCard)
        .join("");

    recipeCount.textContent = `${recipeList.length} recipes`;

    const isEmpty = recipeList.length === 0;
    recipeGrid.hidden = isEmpty;
    noRecipes.hidden = !isEmpty;
}

function updateUrl() {
    const url = new URL(window.location.href);

    const values = {
        q: searchInput.value.trim(),
        category: categoryFilter.value,
        time: timeFilter.value,
        difficulty: difficultyFilter.value
    };

    for (const [key, value] of Object.entries(values)) {
        if (value && value !== "all") {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
    }

    window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`
    );
}

function applyFilters() {
    const searchTerm = normalize(searchInput.value);
    const selectedCategory = normalize(categoryFilter.value);
    const selectedTime = timeFilter.value;
    const selectedDifficulty = normalize(difficultyFilter.value);

    // Luôn lọc từ allRecipes, không lọc tiếp trên kết quả lần trước.
    const filteredRecipes = allRecipes.filter(recipe => {
        const matchesSearch =
            !searchTerm || getSearchableText(recipe).includes(searchTerm);

        const tags = Array.isArray(recipe.tags) ? recipe.tags : [];
        const matchesCategory =
            selectedCategory === "all" ||
            normalize(recipe.mealType) === selectedCategory ||
            tags.some(tag => normalize(tag) === selectedCategory);

        const matchesTime =
            selectedTime === "all" ||
            getTotalTime(recipe) <= Number(selectedTime);

        const matchesDifficulty =
            selectedDifficulty === "all" ||
            normalize(recipe.difficulty) === selectedDifficulty;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesTime &&
            matchesDifficulty
        );
    });

    renderRecipes(filteredRecipes);
    updateUrl();
}

function setSelectFromUrl(select, value) {
    const requestedValue = normalize(value) || "all";
    const matchingOption = Array.from(select.options).find(
        option => normalize(option.value) === requestedValue
    );

    select.value = matchingOption ? matchingOption.value : "all";
}

function restoreFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);

    searchInput.value = params.get("q") || "";
    setSelectFromUrl(categoryFilter, params.get("category"));
    setSelectFromUrl(timeFilter, params.get("time"));
    setSelectFromUrl(difficultyFilter, params.get("difficulty"));
}

function resetFilters() {
    searchInput.value = "";
    categoryFilter.value = "all";
    timeFilter.value = "all";
    difficultyFilter.value = "all";

    applyFilters();
}

function setupEventListeners() {
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        applyFilters();
    });

    searchInput.addEventListener("input", applyFilters);
    categoryFilter.addEventListener("change", applyFilters);
    timeFilter.addEventListener("change", applyFilters);
    difficultyFilter.addEventListener("change", applyFilters);
    resetFiltersBtn.addEventListener("click", resetFilters);
}

function loadApprovedUserRecipes() {
    const storedRecipes = localStorage.getItem("savorly_submissions");

    if (!storedRecipes) {
        return [];
    }

    const userRecipes = JSON.parse(storedRecipes);

    if (!Array.isArray(userRecipes)) {
        return [];
    }

    return userRecipes.filter(recipe => recipe.status === "approved");
}

async function initExplore() {
    // Load recipes từ file JSON
    const loadedRecipes = await loadRecipes();

    // Copy recipes JSON để tránh sửa dữ liệu gốc
    const staticRecipes = JSON.parse(
        JSON.stringify(
            Array.isArray(loadedRecipes) ? loadedRecipes : []
        )
    );

    // Load recipes do user tạo và Admin đã approve
    const userRecipes = loadApprovedUserRecipes();

    // Gộp 2 nguồn dữ liệu
    const combinedRecipes = [
        ...staticRecipes,
        ...userRecipes
    ];

    // Khóa dữ liệu để tránh vô tình thay đổi
    allRecipes = deepFreeze(combinedRecipes);

    restoreFiltersFromUrl();
    setupEventListeners();
    applyFilters();
}

initExplore();