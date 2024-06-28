const express = require('express');
const app = express();
const { toCelsius } = require('celsius');
const convert = require('convert-length');

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
    responseJson.tempfa = responseJson.tempf;
    responseJson.tempinf = toCelsius(responseJson.tempinf, 2);
    responseJson.tempf = toCelsius(responseJson.tempf, 2);
    responseJson.eventrainin = convert(Number(responseJson.eventrainin), 'in', 'mm');
    responseJson.hourlyrainin = convert(Number(responseJson.hourlyrainin), 'in', 'mm');
    responseJson.dailyrainin = convert(Number(responseJson.dailyrainin), 'in', 'mm');
    responseJson.weeklyrainin = convert(Number(responseJson.weeklyrainin), 'in', 'mm');
    responseJson.monthlyrainin = convert(Number(responseJson.monthlyrainin), 'in', 'mm');
    responseJson.yearlyrainin = convert(Number(responseJson.yearlyrainin), 'in', 'mm');
    responseJson.totalrainin = convert(Number(responseJson.totalrainin), 'in', 'mm');
});

app.get('/read', (req, res) => {
    res.status(200).send(responseJson);
});

app.get('/temp', (req, res) => {
    res.status(200).send(responseJson.tempfa);
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
