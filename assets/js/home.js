document.addEventListener("DOMContentLoaded", async function () {

    // 1. Lấy các phần tử HTML
    const heroTrack = document.getElementById("hero-track");
    const pagination = document.getElementById("slider-pagination");
    const prevButton = document.getElementById("prev-slide");
    const nextButton = document.getElementById("next-slide");

    // Kiểm tra các phần tử HTML
    if (!heroTrack || !pagination || !prevButton || !nextButton) {
        console.error("Không tìm thấy các phần tử Slider!");
        return;
    }

    // 2. Khai báo biến
    let recipes = [];
    let sliderRecipes = [];
    let currentIndex = 1;
    let autoSlide;
    let isMoving = false;

    const AUTO_SLIDE_TIME = 5000;
    const SLIDE_SPEED = "0.6s";

    // 3. Tải dữ liệu món ăn từ JSON
    async function loadRecipes() {
        try {
            const response = await fetch("/assets/data/recipe.json");

            if (!response.ok) {
                throw new Error("Không thể tải dữ liệu món ăn!");
            }

            recipes = await response.json();

            if (!recipes.length) {
                throw new Error("Danh sách món ăn đang trống!");
            }

            // Chỉ lấy 4 món đầu tiên cho Hero Slider
            sliderRecipes = recipes.slice(0, 4);

            // Tạo các slide thật trước
            createSlides();

            // Tạo danh sách món ăn Popular Recipes
            createPopularRecipes();

            // Nhân bản slide cuối và slide đầu
            createCloneSlides();

            // Tạo dấu chấm
            createPagination();

            // Hiển thị slide đầu tiên
            updateSlide(false);

            // Bắt đầu tự động chuyển slide
            startAutoSlide();

        } catch (error) {
            console.error("Home Slider Error:", error);
        }
    }
    

    function createPopularRecipes() {
    const popularGrid = document.getElementById("popular-recipe-grid");

    if (!popularGrid) return;

    popularGrid.innerHTML = "";

    recipes.slice(0, 4).forEach(function (recipe) {
        const card = document.createElement("article");
        card.classList.add("recipe-card");

        card.innerHTML = `
            <a href="recipe.html?id=${encodeURIComponent(recipe.id)}"
               class="recipe-image">
                <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
            </a>

            <div class="recipe-info">
                <span class="recipe-category">${recipe.mealType  || "RECIPE"}</span>

                <h3>
                    <a href="recipe.html?id=${encodeURIComponent(recipe.id)}">
                        ${recipe.title}
                    </a>
                </h3>

                <p>${recipe.description}</p>

                <div class="recipe-bottom">
                    <span>
                        <i class="fa-regular fa-clock"></i>
                        ${recipe.prepTime + recipe.cookingTime} min
                    </span>

                    <a href="recipe.html?id=${encodeURIComponent(recipe.id)}"
                       class="button button-outline">
                        View Recipe
                    </a>
                </div>
            </div>
        `;

        popularGrid.appendChild(card);
    });
}

    // 4. Tạo slide từ dữ liệu JSON
    function createSlides() {

        heroTrack.innerHTML = "";

        sliderRecipes.forEach(function (recipe) {

            const slide = document.createElement("article");
            slide.classList.add("hero-slide");

            // Tạo nội dung chữ
            const content = document.createElement("div");
            content.classList.add("hero-content");

            content.innerHTML = `
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

                <a href="recipe.html?id=${encodeURIComponent(recipe.id)}"
                   class="button button-primary">
                    Explore Recipe
                    <span>
                        <i class="fa-solid fa-location-arrow"></i>
                    </span>
                </a>
            `;

            // Tạo hình ảnh
            const imageLink = document.createElement("a");

            imageLink.href = `recipe.html?id=${encodeURIComponent(recipe.id)}`;
            imageLink.classList.add("hero-image");

            const image = document.createElement("img");

            image.src = recipe.image;
            image.alt = recipe.title;

            imageLink.appendChild(image);

            // Đưa nội dung vào slide
            slide.appendChild(content);
            slide.appendChild(imageLink);

            heroTrack.appendChild(slide);
        });
    }

    // 5. Nhân bản slide để tạo hiệu ứng vòng lặp
    function createCloneSlides() {

        const lastSlide = heroTrack.lastElementChild.cloneNode(true);
        const firstSlide = heroTrack.firstElementChild.cloneNode(true);

        // Đưa slide cuối lên đầu
        heroTrack.insertBefore(lastSlide, heroTrack.firstElementChild);

        // Đưa slide đầu xuống cuối
        heroTrack.appendChild(firstSlide);
    }

    // 6. Tạo dấu chấm
    function createPagination() {

        pagination.innerHTML = "";

        sliderRecipes.forEach(function () {

            const dot = document.createElement("span");
            dot.classList.add("slider-dot");

            pagination.appendChild(dot);
        });
    }

    // 7. Cập nhật vị trí slide
    function updateSlide(animate = true) {

        const slideWidth = heroTrack.children[0].offsetWidth;

        heroTrack.style.transition = animate
            ? `transform ${SLIDE_SPEED} ease-in-out`
            : "none";

        heroTrack.style.transform =
            `translateX(-${currentIndex * slideWidth}px)`;

        updatePagination();
    }

    // 8. Cập nhật dấu chấm đang hoạt động
    function updatePagination() {

        const dots = pagination.querySelectorAll(".slider-dot");

        // Trừ 1 vì slide đầu tiên là slide nhân bản
        const activeIndex = currentIndex - 1;

        dots.forEach(function (dot, index) {

            dot.classList.toggle("active", index === activeIndex);

        });
    }

    // 9. Chuyển sang món tiếp theo
    function nextRecipe() {

        if (isMoving) return;

        isMoving = true;
        currentIndex++;

        updateSlide();
    }

    // 10. Quay lại món trước
    function previousRecipe() {

        if (isMoving) return;

        isMoving = true;
        currentIndex--;

        updateSlide();
    }

   // 11. Xử lý khi slide chuyển động kết thúc
    heroTrack.addEventListener("transitionend", function () {

        // Nếu đang ở slide nhân bản cuối
        if (currentIndex === sliderRecipes.length + 1) {

            currentIndex = 1;
            updateSlide(false);

        }

        // Nếu đang ở slide nhân bản đầu
        else if (currentIndex === 0) {

            currentIndex = sliderRecipes.length;
            updateSlide(false);

        }

        isMoving = false;
    });

    // 12. Tự động chuyển slide sau 5 giây
    function startAutoSlide() {

        clearInterval(autoSlide);

        autoSlide = setInterval(function () {
            nextRecipe();
        }, AUTO_SLIDE_TIME);
    }

    // 13. Sự kiện nút mũi tên
    nextButton.addEventListener("click", function () {

        nextRecipe();
        startAutoSlide();

    });

    prevButton.addEventListener("click", function () {

        previousRecipe();
        startAutoSlide();

    });

    // 14. Cập nhật vị trí khi thay đổi kích thước màn hình
    window.addEventListener("resize", function () {
    if (heroTrack.children.length > 0) {
        updateSlide(false);
    }
});

    // 15. Khởi chạy Slider
    await loadRecipes();

});
