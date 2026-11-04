(function () {
    "use strict";

    const LOGIN_PATH = "/savorly/login.html";
    const STORE_PATH = "/savorly/index.html";
    const currentUrl = new URL(window.location.href);

    function requiresAdmin() {
        return currentUrl.pathname === "/savorly/admin.html" ||
            (currentUrl.pathname === "/savorly/recipe.html" &&
                currentUrl.searchParams.get("mode") === "admin");
    }

    function showStorefront() {
        window.location.replace(STORE_PATH);
    }

    async function protectPage() {
        const auth = window.SavorlyAuth;
        if (!auth) {
            window.location.replace(LOGIN_PATH);
            return;
        }

        const profile = await auth.restoreSession();
        if (!profile) {
            const next = encodeURIComponent(
                window.location.pathname + window.location.search + window.location.hash
            );
            window.location.replace(LOGIN_PATH + "?next=" + next);
            return;
        }

        if (requiresAdmin() && profile.role !== auth.ROLES.ADMIN) {
            showStorefront();
            return;
        }

        document.documentElement.classList.remove("auth-checking");
    }

    protectPage().catch(function () {
        window.location.replace(LOGIN_PATH);
    });
}());
