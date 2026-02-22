/**
 * SentinelGov Real-Time Connector v2.0
 * ─────────────────────────────────────
 * Transforms all static HTML views into live, real-time dashboards
 * by connecting to the WebSocket telemetry server and dynamically
 * updating every KPI, timestamp, gauge, log entry, and countdown.
 */

(function () {
    'use strict';

    // ── CONFIG ──────────────────────────────────────────────
    const WS_URL = 'http://localhost:3001';
    let socket = null;
    let telemetry = null;
    let crisisActive = false;
    let startTime = Date.now();

    // ── UTILITY FUNCTIONS ───────────────────────────────────
    function pad(n) { return String(n).padStart(2, '0'); }

    function utcNow() {
        const d = new Date();
        return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
    }

    function utcShort() {
        const d = new Date();
        return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function randomInt(min, max) {
        return Math.floor(randomBetween(min, max));
    }

    function lerp(current, target, speed) {
        return current + (target - current) * speed;
    }

    function formatNumber(n) {
        return n.toLocaleString('en-US');
    }

    // Smoothly animate a number change on an element
    function animateValue(el, start, end, duration, formatter) {
        const startTime = performance.now();
        formatter = formatter || ((v) => Math.round(v).toString());
        function tick(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = start + (end - start) * eased;
            el.textContent = formatter(current);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // ── AGENT LOG GENERATOR ─────────────────────────────────
    const agentNames = ['SENTINEL-01', 'RISK-ENGINE', 'SIM-CORE', 'RESPONSE-AI', 'RESOURCE-MGR', 'GOV-AUDIT', 'MED-BOT-12', 'SEC-UNIT-09', 'LOGISTICS-AI', 'DRONE-SWARM'];
    const agentColors = {
        'SENTINEL-01': 'text-primary', 'RISK-ENGINE': 'text-red-400', 'SIM-CORE': 'text-blue-400',
        'RESPONSE-AI': 'text-emerald-400', 'RESOURCE-MGR': 'text-yellow-400', 'GOV-AUDIT': 'text-purple-400',
        'MED-BOT-12': 'text-emerald-400', 'SEC-UNIT-09': 'text-red-400', 'LOGISTICS-AI': 'text-blue-400',
        'DRONE-SWARM': 'text-orange-400'
    };

    const normalMessages = [
        'Routine infrastructure scan complete. All sectors nominal.',
        'Sensor array calibration verified. Accuracy: {pct}%.',
        'Network topology refresh complete. {n} nodes active.',
        'Drainage system capacity at {pct}%. Operating within parameters.',
        'Traffic flow analysis: {n} vehicles/hour on primary corridors.',
        'Weather pattern update received. No anomalies detected.',
        'Bridge load sensors reporting normal. Stress index: {pct}%.',
        'Population density scan: {n} civilians in monitored zones.',
        'Power grid stability check passed. Load balance: {pct}%.',
        'Communication relay latency: {n}ms. Within threshold.',
        'Water level monitoring: {pct}% of flood threshold.',
        'Emergency response unit standby confirmed. {n} units ready.',
        'Predictive model recalibrated. Confidence: {pct}%.',
        'Satellite imagery processing complete. Resolution optimal.',
        'Seismic sensor array nominal. No tectonic activity detected.',
    ];

    const crisisMessages = [
        'ALERT: Water level rising in Ward 12. Current: +{n}m above baseline.',
        'WARNING: Structural stress detected on North Bridge. Index: {pct}%.',
        'Flood propagation model updated. Spread rate: {n}m²/min.',
        'Emergency evacuation route A-7 congestion at {pct}%. Rerouting.',
        'Pump deployment unit Alpha: {pct}% operational capacity.',
        'CRITICAL: Drainage overflow detected in Sector {n}.',
        'Civilian movement tracking: {n} evacuees in transit.',
        'Resource allocation conflict detected. Negotiating priorities.',
        'Bridge closure protocol: {pct}% traffic diverted successfully.',
        'Medical response team Charlie deployed to Zone {n}.',
        'Power grid sector {n} switching to emergency reserves.',
        'Communication blackout risk in Ward {n}. Deploying relay drones.',
        'Shelter capacity at {pct}%. Requesting additional facilities.',
        'Storm surge prediction updated. ETA: {n} minutes.',
        'Infrastructure damage estimate: ${n}M and rising.',
    ];

    function generateLogMessage() {
        const messages = crisisActive ? crisisMessages : normalMessages;
        let msg = messages[randomInt(0, messages.length)];
        msg = msg.replace('{pct}', randomInt(45, 99).toString());
        msg = msg.replace('{n}', randomInt(2, 450).toString());
        return msg;
    }

    function generateAgentLog() {
        const agent = agentNames[randomInt(0, agentNames.length)];
        return {
            agent,
            color: agentColors[agent] || 'text-primary',
            message: generateLogMessage(),
            time: utcShort(),
            severity: crisisActive ? (Math.random() > 0.5 ? 'critical' : 'warning') : 'info',
        };
    }

    // ── LIVE CLOCK UPDATER ──────────────────────────────────
    function updateAllClocks() {
        // Strategy: find elements containing time patterns and update them
        const timeStr = utcNow();
        const timeShort = utcShort();

        // Update elements with UTC time pattern
        document.querySelectorAll('p, span, div, h4').forEach(el => {
            if (el.children.length > 0) return; // skip parent containers
            const text = el.textContent.trim();

            // Match "HH:MM:SS UTC" format
            if (/^\d{2}:\d{2}:\d{2}\s*UTC$/.test(text)) {
                el.textContent = timeStr;
            }
        });
    }

    // ── KPI FLUCTUATION ENGINE ──────────────────────────────
    // Tracks current values so we can smoothly animate between them
    const kpiState = {
        threatIndex: 75,
        popAffected: 12405,
        responseUnits: 48,
        totalUnits: 52,
        estDamage: 4.2,
        windSpeed: 45,
        bridgeLock: 72,
        resourceCap: 88.4,
        uptime: 99.998,
        mitigationSuccess: 68.2,
        projectedImprovement: 82,
        evacuationCoverage: 100,
        structuralGain: 14.2,
        consensusRate: 98.4,
    };

    function updateKPIs() {
        if (!telemetry) return;

        // Calculate new values based on telemetry + small random deltas
        const base = telemetry.sensorReadings || {};
        const crisis = crisisActive;

        kpiState.threatIndex = crisis
            ? Math.min(95, lerp(kpiState.threatIndex, 60 + base.rainfall * 0.3, 0.1))
            : Math.max(5, lerp(kpiState.threatIndex, 10 + Math.random() * 15, 0.1));

        kpiState.popAffected = crisis
            ? Math.round(lerp(kpiState.popAffected, 10000 + telemetry.activeConnections * 30, 0.08))
            : Math.round(lerp(kpiState.popAffected, 800 + telemetry.activeConnections * 5, 0.05));

        kpiState.responseUnits = randomInt(crisis ? 40 : 46, crisis ? 52 : 52);
        kpiState.estDamage = crisis
            ? Math.round(lerp(kpiState.estDamage * 10, 30 + Math.random() * 25, 0.1)) / 10
            : Math.round(lerp(kpiState.estDamage * 10, 5 + Math.random() * 10, 0.1)) / 10;

        kpiState.windSpeed = Math.round(base.windSpeed || (8 + Math.random() * 12));
        kpiState.bridgeLock = Math.round(lerp(kpiState.bridgeLock, crisis ? 60 + Math.random() * 30 : 70 + Math.random() * 20, 0.15));
        kpiState.resourceCap = Math.round(lerp(kpiState.resourceCap * 10, crisis ? 700 + Math.random() * 200 : 850 + Math.random() * 100, 0.1)) / 10;
        kpiState.uptime = crisis ? (99.9 + Math.random() * 0.09).toFixed(3) : (99.99 + Math.random() * 0.009).toFixed(3);
        kpiState.mitigationSuccess = Math.round(lerp(kpiState.mitigationSuccess * 10, crisis ? 550 + Math.random() * 200 : 650 + Math.random() * 200, 0.1)) / 10;
        kpiState.projectedImprovement = Math.round(lerp(kpiState.projectedImprovement, crisis ? 70 + Math.random() * 20 : 80 + Math.random() * 15, 0.1));
        kpiState.structuralGain = Math.round(lerp(kpiState.structuralGain * 10, 100 + Math.random() * 80, 0.1)) / 10;
        kpiState.consensusRate = Math.round(lerp(kpiState.consensusRate * 10, 960 + Math.random() * 30, 0.05)) / 10;
    }

    // ── PAGE-SPECIFIC UPDATERS ──────────────────────────────

    // -- Control Center Dashboard --
    function updateDashboard() {
        // Threat Index gauge
        const threatText = document.querySelector('.text-4xl.font-display.font-bold.text-white');
        if (threatText && threatText.textContent.includes('%')) {
            const newVal = Math.round(kpiState.threatIndex);
            threatText.textContent = newVal + '%';

            // Update gauge SVG arc
            const gaugeCircle = document.querySelector('circle[stroke-dashoffset]') ||
                document.querySelector('circle[stroke="#ff003c"]');
            if (gaugeCircle) {
                const circumference = 440;
                const offset = circumference - (circumference * newVal / 100);
                gaugeCircle.setAttribute('stroke-dashoffset', offset.toString());

                // Change color based on severity
                if (newVal > 70) {
                    gaugeCircle.setAttribute('stroke', '#ff003c');
                } else if (newVal > 40) {
                    gaugeCircle.setAttribute('stroke', '#f59e0b');
                } else {
                    gaugeCircle.setAttribute('stroke', '#00f0ff');
                }
            }

            // Update severity label
            const severityLabel = threatText.parentElement?.querySelector('.text-xs');
            if (severityLabel) {
                if (newVal > 70) {
                    severityLabel.textContent = 'CRITICAL';
                    severityLabel.className = 'text-xs text-red-400 font-bold uppercase tracking-wider animate-pulse';
                } else if (newVal > 40) {
                    severityLabel.textContent = 'ELEVATED';
                    severityLabel.className = 'text-xs text-yellow-400 font-bold uppercase tracking-wider';
                } else {
                    severityLabel.textContent = 'NOMINAL';
                    severityLabel.className = 'text-xs text-primary font-bold uppercase tracking-wider';
                }
            }
        }

        // Wind Speed
        document.querySelectorAll('span').forEach(el => {
            if (el.textContent.match(/^\d+ km\/h$/)) {
                el.textContent = kpiState.windSpeed + ' km/h';
            }
        });

        // Water Level status
        document.querySelectorAll('span').forEach(el => {
            if (el.textContent === 'Rising' || el.textContent === 'Stable' || el.textContent === 'Falling') {
                el.textContent = crisisActive ? 'Rising' : (Math.random() > 0.5 ? 'Stable' : 'Falling');
                el.className = crisisActive ? 'text-red-400' : 'text-primary';
            }
        });

        // Footer KPIs
        const kpiCards = document.querySelectorAll('footer h4');
        kpiCards.forEach(h4 => {
            const text = h4.textContent.trim();
            if (text.match(/^[\d,]+$/) && parseInt(text.replace(/,/g, '')) > 1000) {
                // Pop. Affected
                h4.textContent = formatNumber(Math.round(kpiState.popAffected));
            } else if (text.match(/^\d+\/\d+$/)) {
                // Response Units
                h4.textContent = kpiState.responseUnits + '/' + kpiState.totalUnits;
            } else if (text.match(/^\$[\d.]+M$/)) {
                // Est. Damage
                h4.textContent = '$' + kpiState.estDamage.toFixed(1) + 'M';
            }
        });

        // Time to Critical countdown
        document.querySelectorAll('footer h4').forEach(h4 => {
            if (h4.textContent.trim().match(/^\d{2}:\d{2}:\d{2}$/)) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const totalSeconds = crisisActive ? Math.max(0, 8040 - elapsed) : Math.max(0, 8040 - elapsed);
                const hrs = pad(Math.floor(totalSeconds / 3600));
                const mins = pad(Math.floor((totalSeconds % 3600) / 60));
                const secs = pad(totalSeconds % 60);
                h4.textContent = `${hrs}:${mins}:${secs}`;
            }
        });

        // Percentage changes in footer
        document.querySelectorAll('footer p').forEach(p => {
            if (p.textContent.includes('+') && p.textContent.includes('%')) {
                const delta = crisisActive ? (3 + Math.random() * 5).toFixed(1) : (0.1 + Math.random() * 2).toFixed(1);
                const icon = p.querySelector('.material-icons-round');
                if (icon) {
                    p.innerHTML = '';
                    p.appendChild(icon);
                    p.append(crisisActive ? ` +${delta}%` : ` +${delta}%`);
                }
            }
        });

        // Active % in footer
        document.querySelectorAll('footer p').forEach(p => {
            if (p.textContent.includes('Active')) {
                const pct = Math.round(kpiState.responseUnits / kpiState.totalUnits * 100);
                const icon = p.querySelector('.material-icons-round');
                if (icon) {
                    p.innerHTML = '';
                    p.appendChild(icon);
                    p.append(` ${pct}% Active`);
                }
            }
        });

        // Latency bars animation
        const latencyBars = document.querySelectorAll('.bg-primary\\/20, .bg-primary\\/30, .bg-primary\\/40, .bg-primary\\/60, .bg-primary\\/80');
        latencyBars.forEach(bar => {
            if (bar.parentElement && bar.parentElement.classList.contains('flex')) {
                const h = randomInt(20, 95);
                bar.style.height = h + '%';
                bar.style.transition = 'height 1.5s ease-out';
            }
        });

        // Network latency text
        document.querySelectorAll('span').forEach(el => {
            if (el.textContent.match(/^\d+ms$/) && el.classList.contains('text-primary')) {
                el.textContent = (telemetry ? telemetry.networkLatency : randomInt(8, 22)) + 'ms';
            }
        });

        // Flood barrier tooltip
        document.querySelectorAll('strong').forEach(el => {
            if (el.textContent.includes('FLOOD BARRIER')) {
                const parent = el.parentElement;
                if (parent) {
                    const waterLvl = crisisActive ? (3 + Math.random() * 3).toFixed(1) : (0.5 + Math.random() * 1).toFixed(1);
                    parent.innerHTML = `<strong class="block text-primary mb-1">FLOOD BARRIER 4A</strong>Status: ${crisisActive ? 'Critical Load' : 'Normal'}<br/>Water Lvl: +${waterLvl}m`;
                }
            }
        });

        // Civilian cluster tooltip
        document.querySelectorAll('strong').forEach(el => {
            if (el.textContent.includes('CIVILIAN CLUSTER')) {
                const parent = el.parentElement;
                if (parent) {
                    const count = crisisActive ? randomInt(300, 600) : randomInt(50, 150);
                    parent.innerHTML = `<strong class="block text-red-500 mb-1">CIVILIAN CLUSTER</strong>${crisisActive ? 'Evacuation Required' : 'Monitoring'}<br/>Count: ~${count}`;
                }
            }
        });
    }

    // -- Execution Command View --
    function updateExecution() {
        const rtLatency = document.getElementById('rt-exec-latency');
        if (rtLatency) {
            const lat = telemetry?.networkLatency || randomInt(2, 12);
            rtLatency.textContent = `${lat.toFixed(1)}ms Latency`;
        }

        const rtBridgeText = document.getElementById('rt-exec-bridge-text');
        const rtBridgeBar = document.getElementById('rt-exec-bridge-bar');
        if (rtBridgeText && rtBridgeBar) {
            const bridge = crisisActive ? 100 : kpiState.bridgeLock;
            rtBridgeText.textContent = `Bridge Access Lock: ${bridge}%`;
            rtBridgeBar.style.width = `${bridge}%`;
        }

        const rtBufferText = document.getElementById('rt-exec-buffer-text');
        const rtBufferBar = document.getElementById('rt-exec-buffer-bar');
        if (rtBufferText && rtBufferBar) {
            const cap = kpiState.resourceCap.toFixed(1);
            rtBufferText.textContent = `${cap}% CAP`;
            rtBufferBar.style.width = `${cap}%`;
        }

        const rtSuccess = document.getElementById('rt-exec-success');
        if (rtSuccess) {
            rtSuccess.textContent = `${kpiState.uptime.toFixed(3)}%`;
        }

        const rtHandshakes = document.getElementById('rt-exec-handshakes');
        if (rtHandshakes) {
            const shakes = crisisActive ? randomInt(4000, 9000) : randomInt(800, 1600);
            rtHandshakes.textContent = `${shakes.toLocaleString()} / SEC`;
        }

        const rtNodes = document.getElementById('rt-exec-nodes');
        if (rtNodes) {
            const activeNodes = crisisActive ? 42 : randomInt(40, 42);
            rtNodes.textContent = `ACTIVE (${activeNodes})`;
        }

        const rtProgText = document.getElementById('rt-exec-progress-text');
        const rtProgBar = document.getElementById('rt-exec-progress-bar');
        if (rtProgText && rtProgBar) {
            let prog = 0;
            if (crisisActive) {
                // simple simulated progress if crisis is active based on time
                const elapsed = (Date.now() - startTime) / 1000;
                prog = Math.min(100, (elapsed / 30) * 100);
            }
            rtProgText.textContent = `${prog.toFixed(1)}%`;
            rtProgBar.style.width = `${prog}%`;
        }

        const rtBitrate = document.getElementById('rt-exec-bitrate');
        if (rtBitrate) {
            const bit = crisisActive ? (12 + Math.random() * 4).toFixed(1) : (2 + Math.random() * 2).toFixed(1);
            rtBitrate.textContent = `${bit} GB / S`;
        }

        // Bridge Access Lock percentage text
        document.querySelectorAll('p').forEach(el => {
            if (el.textContent.includes('Bridge Access Lock:')) {
                el.textContent = 'Bridge Access Lock: ' + kpiState.bridgeLock + '%';
            }
        });

        // Resource capacity
        document.querySelectorAll('span').forEach(el => {
            if (el.textContent.match(/[\d.]+% CAP/)) {
                el.textContent = kpiState.resourceCap.toFixed(1) + '% CAP';
            }
        });

        // Uptime
        document.querySelectorAll('span').forEach(el => {
            if (el.textContent.match(/^99\.\d+%$/)) {
                el.textContent = kpiState.uptime + '%';
            }
        });

        // Active status
        document.querySelectorAll('p').forEach(el => {
            if (el.textContent.match(/^Active \d+%$/)) {
                el.textContent = 'Active ' + (crisisActive ? randomInt(85, 100) : 100) + '%';
            }
        });

        // Timeline timestamps to relative times
        document.querySelectorAll('span').forEach(el => {
            if (el.textContent.match(/^\d{2}:\d{2}:\d{2} UTC$/) && el.classList.contains('text-primary')) {
                el.textContent = utcNow();
            }
        });
    }

    // -- Authorization Portal --
    let authSessionStart = Date.now();
    function updateAuthorization() {
        // Countdown timer
        document.querySelectorAll('p').forEach(el => {
            if (el.textContent.match(/^\d{2}:\d{2}:\d{2}:\d{2}$/)) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const total = Math.max(0, 152538 - elapsed); // ~42 hours
                const days = pad(Math.floor(total / 86400));
                const hrs = pad(Math.floor((total % 86400) / 3600));
                const mins = pad(Math.floor((total % 3600) / 60));
                const secs = pad(total % 60);
                el.textContent = `${days}:${hrs}:${mins}:${secs}`;
            }
        });

        const rtSurge = document.getElementById('rt-auth-surge');
        if (rtSurge) {
            const surge = crisisActive ? (90 + Math.random() * 8.5).toFixed(1) : (30 + Math.random() * 5).toFixed(1);
            rtSurge.innerHTML = `${surge}<span class="text-sm ml-1 text-slate-400">%</span>`;
        }

        const riskVal = telemetry?.metrics?.riskReduction || randomInt(8, 85);

        const rtRiskText = document.getElementById('rt-auth-risk-val');
        if (rtRiskText) rtRiskText.textContent = `${riskVal}%`;

        const rtRiskBar = document.getElementById('rt-auth-risk-bar');
        if (rtRiskBar) rtRiskBar.style.width = `${riskVal}%`;

        const rtStructural = document.getElementById('rt-auth-structural');
        if (rtStructural) {
            const struct = (riskVal * 0.17).toFixed(1);
            rtStructural.textContent = `+${struct}% Structural Stability`;
        }

        const rtLives = document.getElementById('rt-auth-lives');
        if (rtLives) {
            const lives = telemetry?.metrics?.populationProtected || randomInt(12000, 50000);
            rtLives.textContent = lives.toLocaleString();
        }

        const rtSession = document.getElementById('rt-auth-session');
        if (rtSession) {
            const elapsed = Math.floor((Date.now() - authSessionStart) / 1000);
            const hrs = pad(Math.floor(elapsed / 3600));
            const mins = pad(Math.floor((elapsed % 3600) / 60));
            const secs = pad(elapsed % 60);
            const ms = pad(Math.floor((Date.now() % 1000) / 10)); // just visual fake ms
            rtSession.textContent = `${hrs}:${mins}:${secs}:${ms}`;
        }
    }

    // -- Reasoning Modal --
    let lastReasoningLogTime = 0;

    function updateReasoning() {
        // Consensus success rate
        document.querySelectorAll('span, div, p').forEach(el => {
            if (el.textContent.includes('98.') && el.textContent.includes('success rate')) {
                el.innerHTML = el.innerHTML.replace(/\d{2}\.\d%/g, kpiState.consensusRate.toFixed(1) + '%');
            }
        });

        // Progress circle text
        document.querySelectorAll('text, tspan').forEach(el => {
            if (el.textContent.match(/^\d{2}\.\d%$/)) {
                el.textContent = kpiState.consensusRate.toFixed(1) + '%';
            }
        });

        // Dynamic Top KPIs
        const rtLatency = document.getElementById('rt-latency');
        if (rtLatency) {
            const val = telemetry ? telemetry.networkLatency : randomInt(8, 22);
            rtLatency.innerHTML = `${val}<span class="text-sm font-normal text-slate-400">ms</span>`;
        }

        const rtCompute = document.getElementById('rt-compute');
        if (rtCompute) {
            const val = telemetry ? telemetry.cpuUsage : randomInt(35, 65);
            rtCompute.innerHTML = `${val}<span class="text-sm font-normal text-slate-400">%</span>`;
        }

        const rtAgents = document.getElementById('rt-agents');
        if (rtAgents) {
            const val = crisisActive ? randomInt(2, 4) : 4;
            rtAgents.innerHTML = `${val}<span class="text-sm font-normal text-slate-400">/4</span>`;
        }

        // Dynamic AI Reasoning Log Injection
        const logContainer = document.getElementById('rt-reasoning-log');
        if (logContainer && crisisActive) {
            const now = Date.now();
            if (now - lastReasoningLogTime > 4000) {
                lastReasoningLogTime = now;
                const agents = [
                    { name: 'RISK', color: 'text-yellow-500' },
                    { name: 'SIM', color: 'text-blue-400' },
                    { name: 'ORCH', color: 'text-primary' },
                    { name: 'SNTL', color: 'text-emerald-400' }
                ];
                const msgs = [
                    'Recalculating Monte Carlo spread (n=5000)...',
                    'Anomaly propagation isolated to sector 7.',
                    'Diverting compute nodes to predictive modeling.',
                    'Consensus threshold dropping due to variance.',
                    'Adjusting mitigation boundaries.',
                    'New probabilistic model loaded: Gamma-4',
                ];
                const agent = agents[Math.floor(Math.random() * agents.length)];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];

                const logEl = document.createElement('div');
                logEl.className = 'mb-2 flex gap-2 opacity-80';
                logEl.innerHTML = `
                    <span class="text-primary">&gt;</span>
                    <span class="text-slate-300">${utcNow().split(' ')[0]} <span class="${agent.color}">${agent.name}</span> ${msg}</span>
                `;

                // Add before the blinking cursor
                const pulseCursor = logContainer.querySelector('.animate-pulse');
                if (pulseCursor) {
                    pulseCursor.parentNode.insertBefore(logEl, pulseCursor);
                } else {
                    logContainer.appendChild(logEl);
                }

                logContainer.scrollTop = logContainer.scrollHeight;

                // Keep only last 15
                const logs = logContainer.querySelectorAll('.mb-2.flex');
                if (logs.length > 15 && logs[0] !== pulseCursor) {
                    logs[0].remove();
                }
            }
        }
    }

    // -- Agent Decision Logic --
    function updateDecisionLogic() {
        const rtDecConf = document.getElementById('rt-dec-conf');
        if (rtDecConf) rtDecConf.textContent = `CONFIDENCE: ${kpiState.consensusRate.toFixed(1)}%`;

        const rtProjFail = document.getElementById('rt-dec-proj-fail');
        if (rtProjFail) rtProjFail.textContent = '+' + (100 + Math.random() * 15).toFixed(1) + '%';

        const rtGridFail = document.getElementById('rt-dec-grid-fail');
        if (rtGridFail) rtGridFail.textContent = (8 + Math.random() * 8).toFixed(1) + '% (Critical)';

        const rtCascadeFail = document.getElementById('rt-dec-cascade-fail');
        if (rtCascadeFail) rtCascadeFail.textContent = (98 + Math.random() * 2).toFixed(2) + '%';

        const rtProjSuccess = document.getElementById('rt-dec-proj-success');
        if (rtProjSuccess) rtProjSuccess.textContent = '+' + (70 + Math.random() * 18).toFixed(1) + '%';

        const rtGridSuccess = document.getElementById('rt-dec-grid-success');
        if (rtGridSuccess) rtGridSuccess.textContent = (90 + Math.random() * 8).toFixed(1) + '% (Stable)';

        const rtCascadeSuccess = document.getElementById('rt-dec-cascade-success');
        if (rtCascadeSuccess) rtCascadeSuccess.textContent = (0.01 + Math.random() * 0.08).toFixed(2) + '%';
    }

    // ── DYNAMIC AGENT LOG INJECTION ─────────────────────────
    let logContainer = null;
    let logInjectionInterval = null;

    function findLogContainer() {
        if (document.getElementById('rt-cc-log')) return document.getElementById('rt-cc-log');
        // Look for scrollable log containers
        const candidates = document.querySelectorAll('.overflow-y-auto');
        for (const c of candidates) {
            if (c.querySelectorAll('[class*="rounded"][class*="border"]').length >= 2) {
                return c;
            }
        }
        return null;
    }

    function injectAgentLog() {
        if (!logContainer) return;
        const log = generateAgentLog();

        const logEl = document.createElement('div');
        logEl.className = `p-3 rounded ${log.severity === 'critical' ? 'bg-red-900/10 border border-red-500/30' : 'bg-slate-800/50 border border-slate-700/50 hover:border-primary/50'} transition-colors group`;
        logEl.style.opacity = '0';
        logEl.style.transform = 'translateY(-10px)';
        logEl.style.transition = 'all 0.3s ease-out';

        const timestamp = utcNow().split(' ')[0];

        logEl.innerHTML = `
            <div class="flex justify-between mb-1">
                <span class="${log.severity === 'critical' ? 'text-red-400' : 'text-primary'} font-bold">${log.agent}</span>
                <span class="text-slate-500">${timestamp}</span>
            </div>
            <p class="${log.severity === 'critical' ? 'text-red-300' : 'text-slate-300 group-hover:text-white'} transition-colors">${log.message}</p>
        `;

        logContainer.prepend(logEl);

        // Animate in
        requestAnimationFrame(() => {
            logEl.style.opacity = '1';
            logEl.style.transform = 'translateY(0)';
        });

        // Keep only newest 10 logs
        while (logContainer.children.length > 10) {
            logContainer.lastElementChild.remove();
        }

        // Update log count in header if present
        document.querySelectorAll('span').forEach(el => {
            if (el.textContent === 'LIVE') {
                const header = el.closest('.flex')?.querySelector('h2');
                if (header) {
                    const count = logContainer.children.length;
                    header.innerHTML = header.innerHTML.replace(/AGENT LOG.*$/, `AGENT LOG <span class="text-xs text-slate-500 font-mono ml-2">${count} entries</span>`);
                }
            }
        });
    }

    // ── TIMELINE UPDATER (Execution View) ───────────────────
    function updateTimelineEntries() {
        // Find timeline timestamp spans and make them relative to now
        let timelineItems = document.querySelectorAll('.text-\\[10px\\].text-primary.font-mono');
        if (timelineItems.length === 0) {
            timelineItems = document.querySelectorAll('span[class*="font-mono"][class*="text-primary"]');
        }

        const now = new Date();
        timelineItems.forEach((el, i) => {
            if (el.textContent.match(/\d{2}:\d{2}:\d{2}/)) {
                const offset = i * randomInt(1, 3);
                const t = new Date(now.getTime() - offset * 1000);
                el.textContent = `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())} UTC`;
            }
        });
    }

    // ── AGENT LOG TIMESTAMP UPDATER (Dashboard) ─────────────
    function updateLogTimestamps() {
        // Update timestamps inside the agent log to be relative to current time
        const logTimestamps = document.querySelectorAll('.text-slate-500');
        const now = new Date();
        logTimestamps.forEach((el, i) => {
            if (el.textContent.match(/^\d{2}:\d{2}:\d{2}$/)) {
                const offset = (i + 1) * randomInt(8, 30);
                const t = new Date(now.getTime() - offset * 1000);
                el.textContent = `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
            }
        });
    }

    // ── CRISIS PULSE OVERLAY ────────────────────────────────
    let pulseOverlay = null;

    function createCrisisOverlay() {
        pulseOverlay = document.createElement('div');
        pulseOverlay.id = 'sentinel-crisis-overlay';
        pulseOverlay.style.cssText = `
            position: fixed; inset: 0; pointer-events: none; z-index: 9999;
            box-shadow: inset 0 0 120px rgba(255, 0, 60, 0);
            transition: box-shadow 2s ease-in-out;
        `;
        document.body.appendChild(pulseOverlay);
    }

    function updateCrisisOverlay() {
        if (!pulseOverlay) return;
        if (crisisActive) {
            const intensity = 0.15 + Math.sin(Date.now() / 1000) * 0.08;
            pulseOverlay.style.boxShadow = `inset 0 0 120px rgba(255, 0, 60, ${intensity})`;
        } else {
            pulseOverlay.style.boxShadow = 'inset 0 0 120px rgba(255, 0, 60, 0)';
        }
    }

    // ── CONNECTION STATUS INDICATOR ─────────────────────────
    function createConnectionIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'sentinel-ws-status';
        indicator.style.cssText = `
            position: fixed; bottom: 12px; right: 12px; z-index: 10000;
            display: flex; align-items: center; gap: 6px;
            padding: 4px 10px; border-radius: 6px;
            background: rgba(5, 11, 20, 0.9); border: 1px solid rgba(0, 240, 255, 0.2);
            font-family: monospace; font-size: 10px; color: #64748b;
            backdrop-filter: blur(8px);
        `;
        indicator.innerHTML = `
            <span id="ws-dot" style="width:6px;height:6px;border-radius:50%;background:#f59e0b;"></span>
            <span id="ws-text">CONNECTING</span>
        `;
        document.body.appendChild(indicator);
    }

    function updateConnectionStatus(connected) {
        const dot = document.getElementById('ws-dot');
        const text = document.getElementById('ws-text');
        if (dot && text) {
            dot.style.background = connected ? '#00f0ff' : '#ef4444';
            text.textContent = connected ? 'TELEMETRY LIVE' : 'RECONNECTING';
            text.style.color = connected ? '#00f0ff' : '#ef4444';
        }
    }

    // -- Landing Page --
    function updateLandingPage() {
        // Active Agents
        document.querySelectorAll('.font-mono').forEach(el => {
            if (el.textContent.includes('Units')) {
                // To keep numbers around ~14000
                const agents = Math.round(14000 + (telemetry ? telemetry.activeConnections : randomInt(120, 160)));
                el.textContent = formatNumber(agents) + ' Units';
            }
            // Flooding Risk
            if (el.textContent.includes('Flooding Risk')) {
                const risk = Math.round(kpiState.threatIndex);
                el.textContent = 'Flooding Risk: ' + risk + '%';
                // update width
                const barContainer = el.parentElement?.parentElement?.nextElementSibling;
                if (barContainer) {
                    const bar = barContainer.firstElementChild;
                    if (bar) {
                        bar.style.width = risk + '%';
                        bar.style.transition = 'width 1s ease-out';
                        if (crisisActive) {
                            bar.style.backgroundColor = '#ef4444'; // red
                            el.parentElement.parentElement.parentElement.classList.add('shadow-[0_0_20px_rgba(239,68,68,0.5)]');
                        } else {
                            bar.style.backgroundColor = '#3b82f6'; // blue
                            el.parentElement.parentElement.parentElement.classList.remove('shadow-[0_0_20px_rgba(239,68,68,0.5)]');
                        }
                    }
                }
            }
        });

        // 99.9% Uptime and 50ms latency
        document.querySelectorAll('.text-3xl').forEach(el => {
            if (el.textContent.includes('99.')) {
                el.textContent = kpiState.uptime + '%';
            }
            if (el.textContent.match(/^\d+ms$/)) {
                el.textContent = (telemetry ? telemetry.networkLatency : randomInt(8, 22)) + 'ms';
            }
        });

        // Pulse bars for Active Agents
        const pulseBars = document.querySelectorAll('.bg-primary\\/50, .bg-primary\\/80, .bg-primary\\/30, .bg-primary\\/60');
        pulseBars.forEach(bar => {
            if (bar.classList.contains('w-1')) {
                const h = randomInt(8, 24);
                bar.style.height = h + 'px';
                bar.style.transition = 'height 0.2s ease-in-out';
                if (crisisActive) bar.style.backgroundColor = 'rgba(239, 68, 68, 0.8)';
                else bar.style.backgroundColor = '';
            }
        });

        // Alert text
        const alertEl = document.querySelector('.text-red-300, .text-primary');
        if (alertEl && alertEl.textContent.includes('Node') || alertEl?.textContent.includes('Alert') || alertEl?.textContent.includes('Monitor')) {
            const cities = ['Delhi Node', 'Coastal Sector 4', 'Ward 12', 'North Bridge', 'Sector 7'];
            if (crisisActive) {
                alertEl.textContent = 'Alert: ' + cities[randomInt(0, cities.length)];
                alertEl.className = alertEl.className.replace('text-primary', 'text-red-300');
            } else {
                alertEl.textContent = 'Monitoring: ' + cities[randomInt(0, cities.length)];
                alertEl.className = alertEl.className.replace('text-red-300', 'text-primary');
            }
        }
    }

    // -- Control Center Explicit Updates --
    let ccStartTime = Date.now();
    function updateControlCenter() {
        const rtTime = document.getElementById('rt-cc-time');
        if (rtTime) rtTime.textContent = utcNow();

        const rtLat = document.getElementById('rt-cc-latency');
        if (rtLat) {
            const lat = telemetry?.networkLatency || randomInt(8, 20);
            rtLat.textContent = `${lat}ms`;
        }

        const rtThreat = document.getElementById('rt-cc-threat');
        if (rtThreat) {
            const threat = crisisActive ? randomInt(70, 95) : randomInt(5, 15);
            rtThreat.textContent = `${threat}%`;
        }

        const rtPop = document.getElementById('rt-cc-pop');
        if (rtPop) {
            const pop = telemetry?.metrics?.populationProtected || (crisisActive ? randomInt(10000, 45000) : randomInt(0, 100));
            rtPop.textContent = pop.toLocaleString();
        }

        const rtUnits = document.getElementById('rt-cc-units');
        if (rtUnits) {
            const active = crisisActive ? 52 : randomInt(40, 52);
            rtUnits.textContent = `${active}/52`;
        }

        const rtDamage = document.getElementById('rt-cc-damage');
        if (rtDamage) {
            const damage = telemetry?.metrics?.damagePrevented || randomInt(1, 10);
            rtDamage.textContent = `$${damage.toFixed(1)}M`;
        }

        const rtTimer = document.getElementById('rt-cc-timer');
        if (rtTimer) {
            if (!crisisActive) {
                rtTimer.textContent = '00:00:00';
            } else {
                const elapsed = Math.max(0, 8040 - Math.floor((Date.now() - ccStartTime) / 1000));
                const h = pad(Math.floor(elapsed / 3600));
                const m = pad(Math.floor((elapsed % 3600) / 60));
                const s = pad(elapsed % 60);
                rtTimer.textContent = `${h}:${m}:${s}`;
            }
        }
    }

    // ── MAIN UPDATE LOOP ────────────────────────────────────
    function updateAll() {
        updateAllClocks();
        updateKPIs();
        updateCrisisOverlay();

        // Detect which page we're on and apply specific updates
        const title = document.title.toLowerCase();
        const url = window.location.pathname.toLowerCase();

        if (url === '/' || url.endsWith('/index.html') || url === '') {
            updateLandingPage();
        }

        if (url.includes('control_center_dashboard') || title.includes('dashboard')) {
            updateDashboard(); // Keep existing Dashboard updates
            updateLogTimestamps();
            updateControlCenter(); // Add explicit ID bound updates
        }

        if (url.includes('execution_command') || title.includes('execution')) {
            updateExecution();
            updateTimelineEntries();
        }

        if (url.includes('critical_authorization') || title.includes('authorization')) {
            updateAuthorization();
        }

        if (url.includes('agent_reasoning') || title.includes('reasoning')) {
            updateReasoning();
        }

        if (url.includes('agent_decision') || title.includes('decision')) {
            updateDecisionLogic();
        }
    }

    // ── INITIALIZE ──────────────────────────────────────────
    function init() {
        console.log('[SentinelGov Realtime v2.0] Initializing real-time engine...');

        createCrisisOverlay();
        createConnectionIndicator();

        // Find log container for dynamic injection
        logContainer = findLogContainer();

        // Connect to WebSocket
        try {
            socket = io(WS_URL, {
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
                timeout: 5000,
            });

            socket.on('connect', () => {
                console.log('[SentinelGov Realtime v2.0] Connected to telemetry stream.');
                updateConnectionStatus(true);
            });

            socket.on('disconnect', () => {
                console.log('[SentinelGov Realtime v2.0] Disconnected from telemetry.');
                updateConnectionStatus(false);
            });

            socket.on('connect_error', () => {
                updateConnectionStatus(false);
            });

            socket.on('telemetry:update', (data) => {
                telemetry = data;
            });

            socket.on('crisis:acknowledged', () => {
                crisisActive = true;
                console.log('[SentinelGov Realtime v2.0] Crisis mode activated.');
            });

            socket.on('crisis:resolved', () => {
                crisisActive = false;
                console.log('[SentinelGov Realtime v2.0] Crisis resolved.');
            });

            socket.on('system:handshake', (data) => {
                console.log('[SentinelGov Realtime v2.0] Handshake:', data.serverId, 'v' + data.version);
            });

        } catch (err) {
            console.warn('[SentinelGov Realtime v2.0] WebSocket unavailable, running in offline mode.');
            updateConnectionStatus(false);

            // Generate synthetic telemetry for offline mode
            setInterval(() => {
                telemetry = {
                    networkLatency: randomInt(8, 20),
                    cpuUsage: randomInt(15, 40),
                    activeConnections: randomInt(120, 160),
                    sensorReadings: {
                        rainfall: randomBetween(10, 20),
                        windSpeed: randomBetween(8, 20),
                        riverLevel: randomBetween(1.5, 2.5),
                        temperature: randomBetween(22, 27),
                    }
                };
            }, 2000);
        }

        // Main update loop — runs every 2 seconds
        setInterval(updateAll, 2000);

        // Fast clock update — every second
        setInterval(updateAllClocks, 1000);

        // Agent log injection — new log entry every 3–6 seconds
        if (logContainer) {
            logInjectionInterval = setInterval(() => {
                injectAgentLog();
            }, randomInt(3000, 6000));

            // Restart with new random interval periodically
            setInterval(() => {
                if (logInjectionInterval) clearInterval(logInjectionInterval);
                logInjectionInterval = setInterval(() => {
                    injectAgentLog();
                }, randomInt(3000, 6000));
            }, 15000);
        }

        // Initial update
        setTimeout(updateAll, 500);

        console.log('[SentinelGov Realtime v2.0] Engine running. All systems live.');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
