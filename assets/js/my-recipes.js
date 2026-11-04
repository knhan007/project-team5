
/* ========================================
   1. GET HTML ELEMENTS
======================================== */

const addRecipeButton = document.getElementById("add-recipe-button");

const emptyAddRecipeButton = document.getElementById(
    "empty-add-recipe-button"
);

const formSection = document.getElementById(
    "my-recipe-form-section"
);

const formTitle = document.getElementById("recipe-form-title");

const recipeForm = document.getElementById("my-recipe-form");

const cancelRecipeButton = document.getElementById(
    "cancel-recipe-button"
);

const discardRecipeButton = document.getElementById(
    "discard-recipe-button"
);


/* ========================================
   2. OPEN RECIPE FORM
======================================== */
const recipeGrid = document.getElementById("my-recipes-grid");

const recipeCount = document.getElementById("my-recipes-count");

const emptyState = document.getElementById("my-recipes-empty");

async function requireAccount() {
    const profile = window.SavorlyAuth
        ? await window.SavorlyAuth.restoreSession()
        : null;
    if (profile) {
        return true;
    }

    const next = encodeURIComponent(
        window.location.pathname + window.location.search + window.location.hash
    );
    window.location.assign(window.SavorlyPaths.login + "?next=" + next);
    return false;
}

async function openRecipeForm() {
    if (!await requireAccount()) return;

    // Show the form section
    formSection.hidden = false;

    // Set the form title
    formTitle.textContent = "Create a Recipe";

    // Scroll to the form
    formSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


/* Clear the form without closing it */
function clearRecipeForm() {
    recipeForm.reset();

    // Clear the ID used for editing
    document.getElementById("edit-recipe-id").value = "";

    // Reset the form title
    formTitle.textContent = "Create a Recipe";
}

/* Close the form */
function closeRecipeForm() {
    clearRecipeForm();
    formSection.hidden = true;
}
// ========================================
// 3. LOCAL STORAGE
// ========================================

const STORAGE_KEY = "savorly_submissions";

// Get recipes from localStorage
function getRecipes() {
    const recipes = localStorage.getItem(STORAGE_KEY);

    return recipes ? JSON.parse(recipes) : [];
}

// Save recipes to localStorage
function saveRecipes(recipes) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(recipes)
    );
}

// ========================================
// 4. GET FORM DATA
// ========================================

function getRecipeFormData() {
    const title = document.getElementById("recipe-title").value.trim();
    const image = document.getElementById("recipe-image").value.trim();
    const description = document.getElementById("recipe-description").value.trim();

    const mealType = document.getElementById("recipe-category").value;
    const difficulty = document.getElementById("recipe-difficulty").value;

    const prepTime = Number(document.getElementById("recipe-prep-time").value);
    const cookingTime = Number(document.getElementById("recipe-cooking-time").value);
    const servings = Number(document.getElementById("recipe-servings").value);

    const tags = document.getElementById("recipe-tags").value
        .split(",")
        .map(tag => tag.trim())
        .filter(tag => tag !== "");

    const tips = document.getElementById("recipe-tips").value.trim();
    
    // Ingredients: convert textarea string into array of objects
        const ingredients = document
            .getElementById("recipe-ingredients")
            .value
            .trim()
            .split("\n")
            .filter(line => line.trim() !== "")
            .map(line => {
                const [name, quantity, unit] = line.split("|").map(item => item.trim());

                return {
                    name,
                    quantity: quantity === "" || quantity === undefined
                        ? null
                        : Number(quantity),
                    unit: unit || ""
                };
            });

        // Instructions: convert textarea string into array of objects
        const instructions = document
            .getElementById("recipe-instructions")
            .value
            .trim()
            .split("\n")
            .filter(line => line.trim() !== "")
            .map(line => {
                const [title, description] = line.split("|").map(item => item.trim());

        return {
            title: title || "Step",
            description: description || ""
        };
    });
    return {
        title,
        image,
        description,
        mealType,
        difficulty,
        prepTime,
        cookingTime,
        servings,
        tags,
        tips,
        ingredients,
        instructions,
    };
}
// ========================================
// 5. CREATE / UPDATE RECIPE
// ========================================

recipeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Check the session before saving so an expired login cannot submit recipes.
    if (!await requireAccount()) return;

    const recipeData = getRecipeFormData();

    const recipes = getRecipes();

    const editId = document.getElementById("edit-recipe-id").value;

    // EDIT existing recipe
    if (editId) {
        const recipeIndex = recipes.findIndex(
            recipe => recipe.id === editId
        );

        if (recipeIndex === -1) {
            alert("Recipe not found!");
            return;
        }

        recipes[recipeIndex] = {
            ...recipes[recipeIndex],
            ...recipeData,

            // Send edited recipe back for admin review
            status: "pending",
            submittedAt: new Date().toISOString()
        };

        alert("Recipe updated and submitted for admin review!");
    }

    // CREATE new recipe
    else {
        const profile = window.SavorlyAuth.getSession();
        const newRecipe = {
            ...recipeData,
            id: "recipe_" + Date.now(),
            status: "draft",
            submittedBy: profile.name,
            submittedById: profile.id,
            submittedAt: new Date().toISOString()
        };

        recipes.push(newRecipe);

        alert("Recipe saved successfully!");
    }

    saveRecipes(recipes);

    renderRecipes();

    closeRecipeForm();
});
// ========================================
// 6. READ RECIPES
// ========================================

function renderRecipes() {
    const recipes = getRecipes();

    recipeCount.textContent = `${recipes.length} recipes`;

    if (recipes.length === 0) {
        recipeGrid.innerHTML = "";
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    recipeGrid.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">

            <div class="recipe-card-image">
                <img
                    src="${recipe.image}"
                    alt="${recipe.title}"
                >
            </div>

            <div class="recipe-card-content">

                <span class="recipe-card-category">
                    ${recipe.mealType}
                </span>

                <h3>${recipe.title}</h3>

                <p>${recipe.description}</p>

                <div class="recipe-card-info">
                    <span>
                        <i class="fa-regular fa-clock"></i>
                        ${recipe.prepTime + recipe.cookingTime} min
                    </span>

                    <span>${recipe.difficulty}</span>
                </div>

                <div class="recipe-card-status">
                    ${recipe.status || "draft"}
                </div>

                <div class="recipe-card-actions">

                    <button
                        type="button"
                        class="button button-outline edit-recipe-button"
                        data-id="${recipe.id}">
                        <i class="fa-solid fa-pen"></i>
                        Edit
                    </button>

                    <button
                        type="button"
                        class="button delete-recipe-button"
                        data-id="${recipe.id}">
                        <i class="fa-solid fa-trash"></i>
                        Delete
                    </button>
                    

                    ${
                        recipe.status === "draft" || recipe.status === "rejected"
                        ? `
                            <button
                                type="button"
                                class="button submit-recipe-button"
                                data-id="${recipe.id}">
                                <i class="fa-solid fa-paper-plane"></i>
                                Submit
                            </button>
                        `
                        : ""
                    }

                </div>
                <a
                    href="${window.SavorlyPaths.recipe}?id=${recipe.id}&mode=user"
                    class="view-details-button">
                    View Details
                </a>
            </div>

        </div>
    `).join("");
}
renderRecipes();
// ========================================
// 7. EDIT RECIPE
// ========================================

function editRecipe(id) {
    const recipes = getRecipes();

    // Find the recipe we want to edit
    const recipe = recipes.find(recipe => recipe.id === id);

    if (!recipe) {
        alert("Recipe not found!");
        return;
    }

    // Open the form
    formSection.hidden = false;

    // Change form title
    formTitle.textContent = "Edit Recipe";

    // Store recipe ID in hidden input
    document.getElementById("edit-recipe-id").value = recipe.id;

    // Fill the form with existing data
    document.getElementById("recipe-title").value = recipe.title;
    document.getElementById("recipe-image").value = recipe.image;
    document.getElementById("recipe-description").value = recipe.description;
    document.getElementById("recipe-category").value = recipe.mealType;
    document.getElementById("recipe-difficulty").value = recipe.difficulty;
    document.getElementById("recipe-prep-time").value = recipe.prepTime;
    document.getElementById("recipe-cooking-time").value = recipe.cookingTime;
    document.getElementById("recipe-servings").value = recipe.servings;
    document.getElementById("recipe-tags").value = recipe.tags.join(", ");
    document.getElementById("recipe-tips").value = recipe.tips || "";
    // Convert ingredients array to textarea format
    document.getElementById("recipe-ingredients").value =
        (recipe.ingredients || [])
            .map(ingredient => {
                if (typeof ingredient === "string") {
                    return ingredient;
                }

                return `${ingredient.name} | ${ingredient.quantity ?? ""} | ${ingredient.unit || ""}`;
            })
            .join("\n");

    // Convert instructions array to textarea format
    document.getElementById("recipe-instructions").value =
        (recipe.instructions || [])
            .map(step => {
                if (typeof step === "string") {
                    return step;
                }

                return `${step.title || "Step"} | ${step.description || ""}`;
            })
        .join("\n");
    

    // Scroll to form
    formSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

    function submitRecipe(id) {
        const confirmSubmit = confirm(
            "Are you sure you want to submit this recipe for review?"
        );

        if (!confirmSubmit) {
            return;
        }

        const recipes = getRecipes();

        const recipe = recipes.find(
            recipe => recipe.id === id
        );

        if (!recipe) {
            alert("Recipe not found!");
            return;
        }

        if (recipe.status !== "draft" && recipe.status !== "rejected") {
            alert("This recipe cannot be submitted.");
            return;
        }

        recipe.status = "pending";
        recipe.submittedAt = new Date().toISOString();

        saveRecipes(recipes);

        renderRecipes();

        alert("Recipe submitted successfully!");
}


// ========================================
// 8. RECIPE CARD EVENTS
// ========================================
recipeGrid.addEventListener("click", function (event) {

    // EDIT
    const editButton = event.target.closest(".edit-recipe-button");

    if (editButton) {
        editRecipe(editButton.dataset.id);
        return;
    }

    // DELETE
    const deleteButton = event.target.closest(".delete-recipe-button");

    if (deleteButton) {
        deleteRecipe(deleteButton.dataset.id);
        return;
    }

    // SUBMIT
    const submitButton = event.target.closest(".submit-recipe-button");

    if (submitButton) {
        submitRecipe(submitButton.dataset.id);
    }

});



function deleteRecipe(id) {
    const confirmDelete = confirm(
        "Are you sure you want to delete this recipe?"
    );

    if (!confirmDelete) {
        return;
    }

    const recipes = getRecipes();

    const updatedRecipes = recipes.filter(
        recipe => recipe.id !== id
    );

    saveRecipes(updatedRecipes);

    renderRecipes();

    alert("Recipe deleted successfully!");
}



/* Button events */

// Add New Recipe
addRecipeButton.addEventListener("click", openRecipeForm);

// Create Your First Recipe
emptyAddRecipeButton.addEventListener("click", openRecipeForm);

// X button: clear and close
cancelRecipeButton.addEventListener("click", closeRecipeForm);

// Cancel button: clear only, keep form open
discardRecipeButton.addEventListener("click", clearRecipeForm);
