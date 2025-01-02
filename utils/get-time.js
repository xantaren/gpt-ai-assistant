import config from "../config/index.js";

const getCurrentTime = (locales = "zh") => {
    return new Intl.DateTimeFormat(locales, {
        timeZone: config.TIMEZONE,
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(new Date());
}

export default getCurrentTime;
