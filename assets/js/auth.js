(function () {
    "use strict";

    const USERS_KEY = "user.json";
    const LEGACY_ACCOUNTS_KEY = "savorly.accounts.v1";
    const SESSION_KEY = "savorly.currentUser.v1";
    const ITERATIONS = 310000;
    const ADMIN_SEED_PATH = "/assets/data/user.json";
    const DEFAULT_ADMIN = {
        id: "admin-seed",
        name: "Lee Thu",
        email: "leethu@gmail.com",
        password: "1",
        role: "admin",
        createdAt: "2026-11-03T00:00:00.000Z"
    };
    const ROLES = Object.freeze({ USER: "user", ADMIN: "admin" });

    function normalizeRole(role) {
        return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;
    }

    function readAccounts() {
        try {
            let storedUsers = localStorage.getItem(USERS_KEY);
            if (storedUsers === null) {
                storedUsers = localStorage.getItem(LEGACY_ACCOUNTS_KEY);
                if (storedUsers !== null) localStorage.setItem(USERS_KEY, storedUsers);
            }
            const accounts = JSON.parse(storedUsers || "[]");
            return Array.isArray(accounts) ? accounts : [];
        } catch (error) {
            return [];
        }
    }

    function writeAccounts(accounts) {
        localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
        localStorage.removeItem(LEGACY_ACCOUNTS_KEY);
    }

    function bytesToBase64(bytes) {
        let binary = "";
        bytes.forEach(function (byte) { binary += String.fromCharCode(byte); });
        return btoa(binary);
    }

    function base64ToBytes(value) {
        return Uint8Array.from(atob(value), function (character) {
            return character.charCodeAt(0);
        });
    }

    function randomBytes(length) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
    }

    async function deriveMaterial(password, salt) {
        const passwordKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );
        return new Uint8Array(await crypto.subtle.deriveBits({
            name: "PBKDF2",
            hash: "SHA-256",
            salt: salt,
            iterations: ITERATIONS
        }, passwordKey, 512));
    }

    function publicProfile(profile) {
        return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            createdAt: profile.createdAt,
            role: normalizeRole(profile.role)
        };
    }

    async function createAccountRecord(details, role) {
        const email = details.email.trim().toLowerCase();
        const accounts = readAccounts();
        if (accounts.some(function (account) { return account.email === email; })) {
            throw new Error("Email này đã được đăng ký.");
        }

        const salt = randomBytes(16);
        const material = await deriveMaterial(details.password, salt);
        const encryptionKey = await crypto.subtle.importKey(
            "raw",
            material.slice(32),
            { name: "AES-GCM" },
            false,
            ["encrypt"]
        );
        const profile = {
            id: details.id || crypto.randomUUID(),
            name: details.name.trim(),
            email: email,
            createdAt: details.createdAt || new Date().toISOString(),
            role: normalizeRole(role)
        };
        const iv = randomBytes(12);
        const encryptedProfile = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            encryptionKey,
            new TextEncoder().encode(JSON.stringify(profile))
        );

        accounts.push({
            id: profile.id,
            name: profile.name,
            email: email,
            role: profile.role,
            createdAt: profile.createdAt,
            salt: bytesToBase64(salt),
            verifier: bytesToBase64(material.slice(0, 32)),
            iv: bytesToBase64(iv),
            profile: bytesToBase64(new Uint8Array(encryptedProfile))
        });
        writeAccounts(accounts);
        return profile;
    }

    async function seedSampleUsers(seedUsers) {
        for (const seedUser of seedUsers) {
            if (!seedUser || seedUser.role !== ROLES.USER ||
                !seedUser.name || !seedUser.email || !seedUser.password) {
                continue;
            }

            const email = seedUser.email.trim().toLowerCase();
            const accounts = readAccounts();
            const exists = accounts.some(function (account) {
                return account.email === email ||
                    (seedUser.id && account.id === seedUser.id);
            });
            if (!exists) {
                await createAccountRecord(seedUser, ROLES.USER);
                continue;
            }

            const existing = accounts.find(function (account) {
                return account.email === email ||
                    (seedUser.id && account.id === seedUser.id);
            });
            let hasUsableCredentials = false;
            if (existing) {
                try {
                    hasUsableCredentials = base64ToBytes(existing.salt).length === 16 &&
                        base64ToBytes(existing.verifier).length === 32 &&
                        base64ToBytes(existing.iv).length === 12 &&
                        base64ToBytes(existing.profile).length > 0;
                } catch (error) {
                    hasUsableCredentials = false;
                }
            }

            if (!hasUsableCredentials) {
                writeAccounts(accounts.filter(function (account) {
                    return account.email !== email &&
                        (!seedUser.id || account.id !== seedUser.id);
                }));
                await createAccountRecord(seedUser, ROLES.USER);
            }
        }
    }

    async function seedAdmin() {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error("Hãy mở trang qua HTTPS hoặc localhost để bật mã hóa tài khoản.");
        }

        let seedUsers = [DEFAULT_ADMIN];
        try {
            const response = await fetch(ADMIN_SEED_PATH, { cache: "no-store" });
            if (response.ok) {
                const loadedUsers = await response.json();
                if (Array.isArray(loadedUsers)) seedUsers = loadedUsers;
            }
        } catch (error) {
            // Keep the demo account available if the static JSON cannot be read.
        }

        const seedAdminData = seedUsers.find(function (user) {
            return user && user.role === ROLES.ADMIN &&
                user.name && user.email && user.password;
        }) || DEFAULT_ADMIN;

        const accounts = readAccounts();
        const adminEmail = seedAdminData.email.trim().toLowerCase();
        const existingAdmin = accounts.find(function (account) {
            return seedAdminData.id && account.id === seedAdminData.id;
        }) || accounts.find(function (account) {
            return account.email === adminEmail && account.role === ROLES.ADMIN;
        });
        if (existingAdmin) {
            const previousEmail = existingAdmin.email;
            const previousId = existingAdmin.id;
            const nextAdmin = {
                id: seedAdminData.id || existingAdmin.id,
                name: seedAdminData.name,
                email: adminEmail,
                role: ROLES.ADMIN,
                createdAt: seedAdminData.createdAt || existingAdmin.createdAt
            };
            const changed = existingAdmin.id !== nextAdmin.id ||
                existingAdmin.name !== nextAdmin.name ||
                existingAdmin.email !== nextAdmin.email ||
                existingAdmin.role !== nextAdmin.role ||
                existingAdmin.createdAt !== nextAdmin.createdAt;
            Object.assign(existingAdmin, nextAdmin);
            if (changed) {
                writeAccounts(accounts);
            }

            const activeSession = getSession();
            if (activeSession && (activeSession.id === previousId ||
                activeSession.email === previousEmail || activeSession.email === adminEmail)) {
                saveSession({
                    ...activeSession,
                    ...nextAdmin
                });
            }
        } else {
            await createAccountRecord({
                id: seedAdminData.id,
                name: seedAdminData.name,
                email: seedAdminData.email,
                password: seedAdminData.password,
                createdAt: seedAdminData.createdAt
            }, ROLES.ADMIN);
        }

        await seedSampleUsers(seedUsers);
    }

    const ready = seedAdmin();

    async function createAccount(details) {
        await ready;
        return createAccountRecord(details, ROLES.USER);
    }

    async function signIn(emailValue, password) {
        await ready;
        const email = emailValue.trim().toLowerCase();
        const account = readAccounts().find(function (item) { return item.email === email; });
        if (!account) throw new Error("Email hoặc mật khẩu không chính xác.");

        const material = await deriveMaterial(password, base64ToBytes(account.salt));
        const verifier = base64ToBytes(account.verifier);
        let matches = verifier.length === 32;
        for (let index = 0; index < 32 && matches; index += 1) {
            matches = material[index] === verifier[index];
        }
        if (!matches) throw new Error("Email hoặc mật khẩu không chính xác.");

        try {
            const encryptionKey = await crypto.subtle.importKey(
                "raw",
                material.slice(32),
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: base64ToBytes(account.iv) },
                encryptionKey,
                base64ToBytes(account.profile)
            );
            const profile = JSON.parse(new TextDecoder().decode(decrypted));
            profile.name = account.name || profile.name;
            profile.email = account.email || profile.email;
            profile.createdAt = account.createdAt || profile.createdAt;
            profile.role = normalizeRole(account.role || profile.role);
            profile.id = account.id || profile.id || account.email;
            return profile;
        } catch (error) {
            throw new Error("Không thể mở dữ liệu tài khoản. Hãy kiểm tra lại mật khẩu.");
        }
    }

    function saveSession(profile) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(publicProfile(profile)));
    }

    function getSession() {
        try {
            const profile = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
            return profile && profile.email && profile.name
                ? { ...profile, role: normalizeRole(profile.role) }
                : null;
        } catch (error) {
            return null;
        }
    }

    async function restoreSession() {
        try {
            await ready;
            return getSession();
        } catch (error) {
            return null;
        }
    }

    async function signOut() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    async function listUsers() {
        if (!isAdmin()) throw new Error("Chỉ quản trị viên mới xem được danh sách tài khoản.");
        return readAccounts().map(function (account) {
            return {
                id: account.id || account.email,
                name: account.name || "—",
                email: account.email,
                role: normalizeRole(account.role),
                createdAt: account.createdAt || null
            };
        });
    }

    async function updateUserRole(userId, role) {
        if (!isAdmin()) throw new Error("Chỉ quản trị viên mới được đổi vai trò.");
        if (role !== ROLES.USER && role !== ROLES.ADMIN) {
            throw new Error("Vai trò chỉ có thể là user hoặc admin.");
        }

        const accounts = readAccounts();
        const account = accounts.find(function (item) {
            return (item.id || item.email) === userId;
        });
        if (!account) throw new Error("Không tìm thấy tài khoản.");
        if (account.role === ROLES.ADMIN && role !== ROLES.ADMIN &&
            accounts.filter(function (item) { return item.role === ROLES.ADMIN; }).length === 1) {
            throw new Error("Cần giữ lại ít nhất một quản trị viên.");
        }

        account.role = role;
        writeAccounts(accounts);
        return {
            id: account.id || account.email,
            name: account.name || "—",
            email: account.email,
            role: account.role,
            createdAt: account.createdAt || null
        };
    }

    function isAdmin() {
        const profile = getSession();
        return Boolean(profile && profile.role === ROLES.ADMIN);
    }

    function getInitials(name) {
        return name.trim().split(/\s+/).slice(-2).map(function (part) {
            return part.charAt(0);
        }).join("");
    }

    window.SavorlyAuth = {
        ROLES: ROLES,
        ready: ready,
        createAccount: createAccount,
        signIn: signIn,
        saveSession: saveSession,
        getSession: getSession,
        restoreSession: restoreSession,
        listUsers: listUsers,
        updateUserRole: updateUserRole,
        isAdmin: isAdmin,
        signOut: signOut,
        getInitials: getInitials
    };
}());
