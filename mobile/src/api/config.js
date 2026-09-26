// Production is reachable from the APK. Override this with the LAN URL in mobile/.env for local development.
const DEFAULT_API_URL = 'https://zeloura-api.onrender.com/api';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

let warmupInFlight;

export const warmUpBackend = () => {
	if (warmupInFlight) return warmupInFlight;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 75000);
	const backendUrl = API_URL.replace(/\/api$/, '');
	warmupInFlight = fetch(`${backendUrl}/`, { signal: controller.signal })
		.then((response) => {
			if (!response.ok) throw new Error(`Backend respondió HTTP ${response.status}`);
		});

	const request = warmupInFlight;
	request.then(
		() => { if (warmupInFlight === request) warmupInFlight = null; clearTimeout(timeout); },
		() => { if (warmupInFlight === request) warmupInFlight = null; clearTimeout(timeout); }
	);
	return request;
};
