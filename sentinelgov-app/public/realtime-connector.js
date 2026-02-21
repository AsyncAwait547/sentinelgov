const socket = io('http://localhost:3001');

socket.on('connect', () => {
    console.log('[SentinelGov Realtime] Connected to telemetry stream.');
    
    // Auto-update any system time elements
    setInterval(() => {
        const timeElements = document.querySelectorAll('p.font-mono, span.font-mono');
        const now = new Date();
        const timeString = now.toISOString().split('T')[1].split('.')[0] + ' UTC';
        
        timeElements.forEach(el => {
            if (el.innerText.includes('UTC') || el.innerText.match(/^\d{2}:\d{2}:\d{2}$/)) {
                el.innerText = timeString;
            }
        });
    }, 1000);
});

socket.on('telemetry:update', (data) => {
    // Dynamically update latency if found
    const allSpans = document.querySelectorAll('span, div');
    allSpans.forEach(el => {
        // Update latency meters
        if (el.innerText && el.innerText.match(/^\d+ms$/) && !el.classList.contains('do-not-update')) {
            el.innerText = data.networkLatency + 'ms';
        }
        // Update active connections/agents (heuristic finding matching numbers)
        if (el.innerText && el.innerText.includes('14,203 Units')) {
            el.innerHTML = (14000 + data.activeConnections) + ' Units';
        }
    });
});

socket.on('crisis:acknowledged', () => {
    // If a crisis triggers, pulse the UI red
    document.body.style.boxShadow = "inset 0 0 100px rgba(255, 0, 0, 0.2)";
});

socket.on('crisis:resolved', () => {
    document.body.style.boxShadow = "none";
});
