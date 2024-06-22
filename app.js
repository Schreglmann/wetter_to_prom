const express = require('express');
const fs = require('fs');
const app = express();
const client = require('prom-client');
const { toCelsius } = require('celsius');

// Create a Registry to register the metrics
const register = new client.Registry();

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Create a gauge metric
const responseGauge = new client.Gauge({
  name: 'app_response_length',
  help: 'Length of the response string',
  registers: [register],
});

app.use(express.raw({ type: '*/*', limit: '10mb' }));

const port = 3001;
let responseJson = {};
let responseProm = "";

app.post('/write', (req, res) => {
    const rawBody = req.body;
    const responseBody = rawBody.toString('utf-8');

    console.log("New Data received at " + new Date().toISOString());

    responseJson = responseBody.split('&').reduce((acc, item) => {
        const [key, value] = item.split('=');
        acc[key] = value;
        return acc;
    }, {});
    responseJson.tempinf = toCelsius(responseJson.tempinf, 2);
    responseJson.tempf = toCelsius(responseJson.tempf, 2);



    // responseGauge.set(response.tempinf);
    // responseGauge.set(response.tempf);
});

app.get('/read', (req, res) => {
    res.status(200).send(responseJson);
});

// Expose the metrics at the /metrics endpoint
app.get('/metrics', async (req, res) => {
    const metrics = formatMetricsForPrometheus(responseJson);
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  });

app.listen(port, () => console.log('Server running on port ' + port + '...'));

// Function to format the responseJson object for Prometheus
function formatMetricsForPrometheus(data) {
    let metricsString = '';
    Object.keys(data).forEach(key => {
        if (key === 'PASSKEY') return; // Skip the PASSKEY field
        const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize key for Prometheus metric name
        const value = parseFloat(data[key]);
        if (!isNaN(value)) { // Ensure the value is a number
            metricsString += `# HELP application_${sanitizedKey} Current value of ${sanitizedKey}\n`;
            metricsString += `# TYPE application_${sanitizedKey} gauge\n`;
            metricsString += `application_${sanitizedKey} ${value}\n`;
            metricsString += `\n`;
        }
    });
    return metricsString;
}
