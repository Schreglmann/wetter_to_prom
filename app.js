const express = require('express');
const app = express();
const { toCelsius } = require('celsius');

app.use(express.raw({ type: '*/*', limit: '10mb' }));

const port = 80;
let responseJson = {};

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
