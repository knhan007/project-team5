document.addEventListener("DOMContentLoaded", function () {

    // 1. Lấy các phần tử HTML
    const heroTrack = document.getElementById("hero-track");
    const pagination = document.getElementById("slider-pagination");
    const prevButton = document.getElementById("prev-slide");
    const nextButton = document.getElementById("next-slide");
    const popularGrid = document.getElementById("popular-recipe-grid");

    // 2. Khai báo biến
    let recipes = [];
    let sliderRecipes = [];
    let currentIndex = 1;
    let isMoving = false;
    let autoSlide;

    const AUTO_SLIDE_TIME = 5000;
    
    // 3. Tải dữ liệu món ăn từ JSON
    fetch("../assets/data/recipe.json")
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {

            recipes = data;

            // Lấy 4 món đầu tiên cho Hero Slider
            sliderRecipes = recipes.slice(0, 4);

            createSlides();
            createPopularRecipes();
            createCloneSlides();
            createPagination();
            updateSlide(false);
            startAutoSlide();

        });

    // 4. Hiển thị 3 món ăn trong Popular Recipes
    function createPopularRecipes() {

        popularGrid.innerHTML = "";

        recipes.slice(0, 3).forEach(function (recipe) {

            const card = document.createElement("article");
            card.classList.add("recipe-card");

            card.innerHTML = `
                <a href="recipe.html?id=${recipe.id}" class="recipe-image">
                    <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
                </a>

                <div class="recipe-info">
                    <span class="recipe-category">
                        ${recipe.mealType || "RECIPE"}
                    </span>

                    <h3>
                        <a href="recipe.html?id=${recipe.id}">
                            ${recipe.title}
                        </a>
                    </h3>

                    <p>${recipe.description}</p>

                    <div class="recipe-bottom">
                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${recipe.prepTime + recipe.cookingTime} min
                        </span>

                        <a href="recipe.html?id=${recipe.id}"
                           class="button button-outline">
                            View Recipe
                        </a>
                    </div>
                </div>
            `;

            popularGrid.appendChild(card);
        });
    }

    // 5. Tạo các slide từ dữ liệu JSON
    function createSlides() {

        heroTrack.innerHTML = "";

        sliderRecipes.forEach(function (recipe) {

            const slide = document.createElement("article");
            slide.classList.add("hero-slide");

            slide.innerHTML = `
                <div class="hero-content">
                    <span class="eyebrow">TODAY'S SPECIAL</span>

                    <h1>${recipe.title}</h1>

                    <p class="hero-description">
                        ${recipe.description}
                    </p>

                    <div class="hero-meta">
                        <span>
                            <i class="fa-regular fa-clock"></i>
                            ${recipe.prepTime + recipe.cookingTime} minutes
                        </span>

                        <span>·</span>

                        <span>${recipe.difficulty} to make</span>
                    </div>

                    <a href="recipe.html?id=${recipe.id}"
                       class="button button-primary">
                        Explore Recipe
                        <span>
                            <i class="fa-solid fa-location-arrow"></i>
                        </span>
                    </a>
                </div>

                <a href="recipe.html?id=${recipe.id}" class="hero-image">
                    <img src="${recipe.image}" alt="${recipe.title}">
                </a>
            `;

            heroTrack.appendChild(slide);
        });
    }

    // 6. Nhân bản slide đầu và slide cuối
    function createCloneSlides() {

        const lastSlide = heroTrack.lastElementChild.cloneNode(true);
        const firstSlide = heroTrack.firstElementChild.cloneNode(true);

        heroTrack.insertBefore(lastSlide, heroTrack.firstElementChild);
        heroTrack.appendChild(firstSlide);
    }

    // 7. Tạo dấu chấm phân trang
    function createPagination() {

        pagination.innerHTML = "";

        sliderRecipes.forEach(function () {

            const dot = document.createElement("span");
            dot.classList.add("slider-dot");

            pagination.appendChild(dot);
        });
    }

    // 8. Cập nhật vị trí slide
   function updateSlide(animate) {

    const slideWidth = heroTrack.children[0].offsetWidth;

    if (animate === undefined) {
        animate = true;
    }

    if (animate === true) {
        heroTrack.style.transition = "transform 0.6s ease-in-out";
    } else {
        heroTrack.style.transition = "none";
    }

    heroTrack.style.transform =
        `translateX(-${currentIndex * slideWidth}px)`;

    updatePagination();
}

    // 9. Cập nhật dấu chấm đang hoạt động
    function updatePagination() {

        const dots = pagination.querySelectorAll(".slider-dot");
        const activeIndex = currentIndex - 1;

        dots.forEach(function (dot, index) {

            dot.classList.toggle("active", index === activeIndex);

        });
    }

    // 10. Chuyển sang món tiếp theo
    function nextRecipe() {

        if (isMoving) return;

        isMoving = true;
        currentIndex++;

        updateSlide();
    }

    // 11. Quay lại món trước
    function previousRecipe() {

        if (isMoving) return;

        isMoving = true;
        currentIndex--;

        updateSlide();
    }

    // 12. Xử lý khi chuyển slide kết thúc
    heroTrack.addEventListener("transitionend", function () {

        if (currentIndex === sliderRecipes.length + 1) {

            currentIndex = 1;
            updateSlide(false);

        } else if (currentIndex === 0) {

            currentIndex = sliderRecipes.length;
            updateSlide(false);

        }

        isMoving = false;
    });

    // 13. Tự động chuyển slide sau 5 giây
    function startAutoSlide() {

        clearInterval(autoSlide);

        autoSlide = setInterval(function () {
            nextRecipe();
        }, AUTO_SLIDE_TIME);
    }

    // 14. Xử lý nút chuyển slide
    nextButton.addEventListener("click", function () {

        nextRecipe();
        startAutoSlide();

    });

    prevButton.addEventListener("click", function () {

        previousRecipe();
        startAutoSlide();

    });

    // 15. Cập nhật slide khi thay đổi kích thước màn hình
    window.addEventListener("resize", function () {
        updateSlide(false);
    });

});

