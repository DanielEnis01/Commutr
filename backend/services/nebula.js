import 'dotenv/config';

const EXCLUDED_ACTIVITY_PATTERNS = [
    /\bblock\b/i,
    /\bhack/i,
    /\bevent\b/i,
    /\bcareer fair\b/i,
    /\bconference\b/i,
    /\bceremony\b/i,
    /\bcompetition\b/i,
    /\bexec ed\b/i,
];

const EXCLUDED_MEETING_TYPE_PATTERNS = [
    /\bevent\b/i,
    /\breservation\b/i,
    /\bconference\b/i,
];

function isAcademicClassEvent(event) {
    const activityName = String(event.activity_name || '').trim();
    const meetingType = String(event.meeting_type || '').trim();

    if (!activityName || activityName === 'No Event Requesting') {
        return false;
    }

    if (EXCLUDED_MEETING_TYPE_PATTERNS.some((pattern) => pattern.test(meetingType))) {
        return false;
    }

    if (EXCLUDED_ACTIVITY_PATTERNS.some((pattern) => pattern.test(activityName))) {
        return false;
    }

    return true;
}

async function getParkingPressureData(NEBULA_API_KEY, targetDateISO = null) {
    const zone = 'America/Chicago';
    const now = targetDateISO ? new Date(targetDateISO) : new Date();

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const dateString = formatter.format(now);

    const timeParts = now.toLocaleTimeString('en-US', {
        timeZone: zone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    }).split(':');
    const currentMins = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

    try {
        const response = await fetch(`https://api.utdnebula.com/astra/${dateString}`, {
            headers: { 'x-api-key': NEBULA_API_KEY }
        });

        if (!response.ok) {
            console.error(`Nebula API error: ${response.status} ${response.statusText}`);
            return { data: { ended: [], current: [], starting: [] } };
        }

        const result = await response.json();
        const buildings = result.data?.buildings || [];

        console.log(`[Nebula] Data fetched for ${dateString}. Filtering for time: ${currentMins} mins (${timeParts[0]}:${timeParts[1]})`);

        const categorized = {
            ended: [],
            current: [],
            starting: []
        };

        buildings.forEach(building => {
            (building.rooms || []).forEach(room => {
                (room.events || []).forEach(event => {
                    if (!event.start_date || !event.end_date) return;
                    if (!isAcademicClassEvent(event)) return;

                    const startDate = new Date(event.start_date);
                    const endDate = new Date(event.end_date);

                    const sParts = startDate.toLocaleTimeString('en-US', { timeZone: zone, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':');
                    const eParts = endDate.toLocaleTimeString('en-US', { timeZone: zone, hour12: false, hour: '2-digit', minute: '2-digit' }).split(':');

                    const startTotal = parseInt(sParts[0]) * 60 + parseInt(sParts[1]);
                    const endTotal = parseInt(eParts[0]) * 60 + parseInt(eParts[1]);

                    const payload = {
                        activity: event.activity_name,
                        building: building.building,
                        capacity: event.capacity || 0,
                        type: event.meeting_type,
                        start: startDate.toLocaleTimeString('en-US', { timeZone: zone }),
                        end: endDate.toLocaleTimeString('en-US', { timeZone: zone })
                    };

                    if (startTotal > currentMins && startTotal <= currentMins + 30) {
                        categorized.starting.push(payload);
                    } else if (currentMins >= startTotal && currentMins <= endTotal) {
                        categorized.current.push(payload);
                    } else if (currentMins > endTotal && currentMins <= endTotal + 15) {
                        categorized.ended.push(payload);
                    }
                });
            });
        });

        return {
            queryTime: now.toLocaleTimeString('en-US', { timeZone: zone }),
            data: categorized
        };
    } catch (error) {
        console.error("Failed to fetch Nebula data:", error);
        return { data: { ended: [], current: [], starting: [] } };
    }
}

export { getParkingPressureData };
