export function getUTCToPuertoRicoISODate(date) {
    // Get the UTC time
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

    // Puerto Rico is UTC-4
    const puertoRicoOffset = -4;
    const puertoRicoOffsetInMs = puertoRicoOffset * 60 * 60 * 1000;

    // Convert the UTC time to Puerto Rico time
    const puertoRicoTime = new Date(date.getTime() + puertoRicoOffsetInMs);

    // Get the Puerto Rico time components
    const prYear = puertoRicoTime.getUTCFullYear();
    const prMonth = String(puertoRicoTime.getUTCMonth() + 1).padStart(2, '0');
    const prDay = String(puertoRicoTime.getUTCDate()).padStart(2, '0');
    const prHours = String(puertoRicoTime.getUTCHours()).padStart(2, '0');
    const prMinutes = String(puertoRicoTime.getUTCMinutes()).padStart(2, '0');
    const prSeconds = String(puertoRicoTime.getUTCSeconds()).padStart(2, '0');
    const prMilliseconds = String(puertoRicoTime.getUTCMilliseconds()).padStart(3, '0');

    // Construct the ISO 8601 string with Puerto Rico offset
    const isoDate = `${prYear}-${prMonth}-${prDay}T${prHours}:${prMinutes}:${prSeconds}.${prMilliseconds}-04:00`;

    return isoDate;
}
