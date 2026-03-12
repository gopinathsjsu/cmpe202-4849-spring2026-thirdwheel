function generateCalendarFile(event) {
    const formatDate = (date, time) => {
        const d = new Date(`${date}T${time}:00`);
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const dtStart = formatDate(event.date, event.time);
    const dtEnd = event.end_date
        ? formatDate(event.end_date, event.end_time || event.time)
        : formatDate(event.date, event.end_time || event.time);

    const ical = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Zestify//Event Platform//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.short_description || event.description.substring(0, 200)}`,
        `LOCATION:${event.location}`,
        `URL:${event.is_online ? event.online_url : ''}`,
        `UID:${event.id}@zestify.com`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');

    return ical;
}

function generateGoogleCalendarUrl(event) {
    const formatGoogleDate = (date, time) => {
        const d = new Date(`${date}T${time}:00`);
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const startDate = formatGoogleDate(event.date, event.time);
    const endDate = event.end_date
        ? formatGoogleDate(event.end_date, event.end_time || event.time)
        : formatGoogleDate(event.date, event.end_time || event.time);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${startDate}/${endDate}`,
        details: event.short_description || event.description.substring(0, 200),
        location: event.is_online ? event.online_url : event.location,
        sf: 'true',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

module.exports = { generateCalendarFile, generateGoogleCalendarUrl };
