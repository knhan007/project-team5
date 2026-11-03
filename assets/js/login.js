(function () {
    "use strict";

    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const tabs = document.querySelectorAll("[data-auth-tab]");
    const message = document.getElementById("auth-message");
    const submitButtons = document.querySelectorAll(".auth-submit");

    function showMessage(text, kind) {
        message.textContent = text;
        message.dataset.kind = kind || "error";
    }

    function setBusy(busy) {
        submitButtons.forEach(function (button) {
            button.disabled = busy;
            button.textContent = busy ? "Đang xử lý..." : button.dataset.label;
        });
    }

    function openTab(tabName) {
        const isSignup = tabName === "signup";
        loginForm.hidden = isSignup;
        signupForm.hidden = !isSignup;
        tabs.forEach(function (tab) {
            const selected = tab.dataset.authTab === tabName;
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
        });
        showMessage("", "error");
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            openTab(tab.dataset.authTab);
        });
    });

    function redirectAfterLogin() {
        const next = new URLSearchParams(window.location.search).get("next");
        const destination = next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/savorly/index.html";
        window.location.assign(destination);
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        showMessage("", "error");
        setBusy(true);
        try {
            const profile = await window.SavorlyAuth.signIn(
                document.getElementById("login-email").value,
                document.getElementById("login-password").value
            );
            window.SavorlyAuth.saveSession(profile);
            redirectAfterLogin();
        } catch (error) {
            showMessage(error.message || "Đăng nhập chưa thành công.");
        } finally {
            setBusy(false);
        }
    });

    signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        showMessage("", "error");
        setBusy(true);
        try {
            const profile = await window.SavorlyAuth.createAccount({
                name: document.getElementById("signup-name").value,
                email: document.getElementById("signup-email").value,
                password: document.getElementById("signup-password").value
            });
            window.SavorlyAuth.saveSession(profile);
            redirectAfterLogin();
        } catch (error) {
            showMessage(error.message || "Đăng ký chưa thành công.");
        } finally {
            setBusy(false);
        }
    });

    window.SavorlyAuth.ready.catch(function (error) {
        showMessage(error.message || "Không thể khởi tạo tài khoản.");
        submitButtons.forEach(function (button) { button.disabled = true; });
    });

}());
