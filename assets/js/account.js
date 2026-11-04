(function () {
    "use strict";

    const slot = document.querySelector("[data-account-slot]");
    if (!slot || !window.SavorlyAuth) return;

    function addAccountDetail(list, label, value) {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        list.appendChild(row);
    }

    function render() {
        slot.replaceChildren();
        const profile = window.SavorlyAuth.getSession();

        if (!profile) {
            const search = document.createElement("a");
            search.className = "search-button";
            search.href = "explore.html";
            search.setAttribute("aria-label", "Tìm kiếm công thức");
            search.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';

            const signIn = document.createElement("a");
            signIn.className = "nav-auth-link";
            signIn.href = "/savorly/login.html";
            signIn.textContent = "Đăng nhập";
            slot.append(search, signIn);
            return;
        }

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "account-trigger";
        trigger.setAttribute("aria-haspopup", "true");
        trigger.setAttribute("aria-expanded", "false");

        const name = document.createElement("span");
        name.className = "account-name";
        name.textContent = profile.name;

        const avatar = document.createElement("span");
        avatar.className = "account-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = window.SavorlyAuth.getInitials(profile.name);
        trigger.append(name, avatar);

        const menu = document.createElement("div");
        menu.className = "account-menu";
        menu.hidden = true;
        menu.setAttribute("role", "dialog");
        menu.setAttribute("aria-label", "Thông tin tài khoản");

        const heading = document.createElement("p");
        heading.className = "account-menu-heading";
        heading.textContent = "Tài khoản của bạn";

        const list = document.createElement("dl");
        list.className = "account-menu-list";
        addAccountDetail(list, "Tên tài khoản", profile.name);
        addAccountDetail(list, "Email", profile.email);
        addAccountDetail(list, "Vai trò",
            profile.role === window.SavorlyAuth.ROLES.ADMIN
                ? "Quản trị viên"
                : "Người dùng");
        const createdAt = new Date(profile.createdAt);
        addAccountDetail(list, "Ngày tham gia",
            Number.isNaN(createdAt.getTime()) ? "—" :
                createdAt.toLocaleDateString("vi-VN"));

        let adminLink = null;
        if (profile.role === window.SavorlyAuth.ROLES.ADMIN) {
            adminLink = document.createElement("a");
            adminLink.className = "account-admin-link";
            adminLink.href = "/savorly/admin.html";
            adminLink.textContent = "Mở trang quản trị";
        }

        const logout = document.createElement("button");
        logout.type = "button";
        logout.className = "account-logout";
        logout.textContent = "Đăng xuất";

        trigger.addEventListener("click", function () {
            const open = menu.hidden;
            menu.hidden = !open;
            trigger.setAttribute("aria-expanded", String(open));
        });
        logout.addEventListener("click", function () {
            window.SavorlyAuth.signOut().catch(function () {}).finally(function () {
                window.location.replace("/savorly/login.html");
            });
        });
        document.addEventListener("click", function (event) {
            if (!slot.contains(event.target)) {
                menu.hidden = true;
                trigger.setAttribute("aria-expanded", "false");
            }
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                menu.hidden = true;
                trigger.setAttribute("aria-expanded", "false");
            }
        });

        menu.append(heading, list);
        if (adminLink) menu.appendChild(adminLink);
        menu.appendChild(logout);
        slot.append(trigger, menu);
    }

    window.SavorlyAuth.restoreSession().finally(render);
}());
