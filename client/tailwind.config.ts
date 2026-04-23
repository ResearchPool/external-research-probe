export default {
    theme: {
        extend: {
            keyframes: {
                fadeInUp: {
                    "0%": { opacity: "0", transform: "translateY(6px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                fadeInUp: "fadeInUp 0.25s ease-out forwards",
            },
        },
    },
};