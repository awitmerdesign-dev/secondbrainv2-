const VaultCrypto = {
    async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 200000,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    async encrypt(data, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);

        const enc = new TextEncoder();
        const encoded = enc.encode(JSON.stringify(data));

        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            encoded
        );

        return {
            encrypted: Array.from(new Uint8Array(encrypted)),
            salt: Array.from(salt),
            iv: Array.from(iv)
        };
    },

    async decrypt(encryptedData, password) {
        const salt = new Uint8Array(encryptedData.salt);
        const iv = new Uint8Array(encryptedData.iv);
        const encrypted = new Uint8Array(encryptedData.encrypted);

        const key = await this.deriveKey(password, salt);

        try {
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encrypted
            );

            const dec = new TextDecoder();
            const decryptedText = dec.decode(decrypted);
            return JSON.parse(decryptedText);
        } catch (e) {
            throw new Error('Invalid password or corrupted data');
        }
    },

    generatePassword(length = 16, options = {}) {
        const {
            useUppercase = true,
            useLowercase = true,
            useDigits = true,
            useSymbols = true
        } = options;

        let chars = '';
        if (useLowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (useUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useDigits) chars += '0123456789';
        if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        if (chars.length === 0) chars = 'abcdefghijklmnopqrstuvwxyz';

        const array = new Uint8Array(length);
        crypto.getRandomValues(array);

        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars[array[i] % chars.length];
        }

        return password;
    },

    estimatePasswordStrength(password) {
        if (!password) return { score: 0, feedback: 'Enter a password' };

        let score = 0;
        let feedback = [];

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;

        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (password.length < 8) {
            feedback.push('Use at least 8 characters');
        }
        if (!/[a-z]/.test(password)) {
            feedback.push('Add lowercase letters');
        }
        if (!/[A-Z]/.test(password)) {
            feedback.push('Add uppercase letters');
        }
        if (!/[0-9]/.test(password)) {
            feedback.push('Add numbers');
        }
        if (!/[^a-zA-Z0-9]/.test(password)) {
            feedback.push('Add symbols');
        }

        const strength = score <= 2 ? 'weak' : score <= 4 ? 'fair' : score <= 6 ? 'good' : 'strong';

        return {
            score: Math.min(score, 7),
            maxScore: 7,
            strength,
            feedback: feedback.join(', ')
        };
    }
};

window.VaultCrypto = VaultCrypto;
