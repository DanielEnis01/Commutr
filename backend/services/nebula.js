import 'dotenv/config';

let parkingData = null;

async function getParkingPressureData(NEBULA_API_KEY) {
    //const now = new Date();
    const now = new Date('2026-03-06T12:00:00');
    const dateString = now.toISOString().split('T')[0];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const response = await fetch(`https://api.utdnebula.com/astra/${dateString}`, {
        headers: { 'x-api-key': NEBULA_API_KEY }
    });

    const result = await response.json();
    const buildings = result.data?.buildings || [];

    const categorized = {
        ended: [],
        current: [],
        starting: []
    };

    buildings.forEach(building => {
        (building.rooms || []).forEach(room => {
            (room.events || []).forEach(event => {
                if (!event.start_date || !event.end_date){
                    return;
                }
                if (event.activity_name === 'No Event Requesting'){
                    return;
                } 

                const startDate = new Date(event.start_date);
                const endDate = new Date(event.end_date);
                const startTotal = startDate.getHours() * 60 + startDate.getMinutes();
                const endTotal = endDate.getHours() * 60 + endDate.getMinutes();

                const payload = {
                    activity: event.activity_name,
                    building: building.building,
                    room: room.room,
                    capacity: event.capacity || 0,
                    type: event.meeting_type,
                    start: startDate.toLocaleTimeString(),
                    end: endDate.toLocaleTimeString()
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
        queryTime: now.toLocaleTimeString(),
        data: categorized
    };
}

async function testNebulaCall() {
    const apiKey = process.env.NEBULA_API_KEY;
    if (!apiKey) {
        console.error('NEBULA_API_KEY is not set in .env');
        process.exit(1);
    }

    try {
        console.log('Fetching parking pressure data from Nebula...\n');
        parkingData = await getParkingPressureData(apiKey);

        console.log(`Query Time: ${parkingData.queryTime}\n`);
        console.table({
            "Starting (next 30 min)": parkingData.data.starting.length,
            "Currently Active": parkingData.data.current.length,
            "Recently Ended": parkingData.data.ended.length
        });

        if (parkingData.data.starting.length > 0) {
            console.log('\nStarting Soon:');
            console.table(parkingData.data.starting);
        }
        if (parkingData.data.current.length > 0) {
            console.log('\nCurrently Active:');
            console.table(parkingData.data.current);
        }
        if (parkingData.data.ended.length > 0) {
            console.log('\nRecently Ended:');
            console.table(parkingData.data.ended);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testNebulaCall();

export { getParkingPressureData };