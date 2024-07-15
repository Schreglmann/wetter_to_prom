#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <HTTPClient.h>
#define SEALEVELPRESSURE_HPA (1013.25)
Adafruit_BME280 bme;  // I2C
const char* ssid = "";
const char* password = "";
String room = "Arbeitszimmer";
AsyncWebServer server(80);
void setup() {
  Serial.begin(9600);
  // Initialize pins as outputs
  pinMode(LED_BUILTIN, OUTPUT);

  pinMode(14, OUTPUT);
  pinMode(15, OUTPUT);
  pinMode(16, OUTPUT);
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
  // Print the ESP32's IP address
  Serial.print("ESP32 Web Server's IP address: ");
  Serial.println(WiFi.localIP());
  Serial.println(room);

  unsigned status;
  status = bme.begin(0x76);

  // Define a route to serve the HTML page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
    float temperature = bme.readTemperature();
    float humidity = bme.readHumidity();
    float pressure = bme.readPressure();

    char metrics[1000];
    snprintf(metrics, sizeof(metrics),
           "# HELP application_temp%s Temperature in Celsius\n"
           "# TYPE application_temp%s gauge\n"
           "application_temp%s{room=\"%s\",unit=\"C\"} %.2f\n"
           "# HELP application_humidity%s Relative Humidity in percent\n"
           "# TYPE application_humidity%s gauge\n"
           "application_humidity%s{room=\"%s\",unit=\"%%\"} %.2f\n"
           "# HELP application_pressure%s Pressure in hPa\n"
           "# TYPE application_pressure%s gauge\n"
           "application_pressure%s{room=\"%s\",unit=\"hPa\"} %.2f\n",
           room, room, room, room, temperature, 
           room, room, room, room, humidity, 
           room, room, room, room, pressure);
    request->send(200, "text/plain", metrics);
  });
  server.begin();
}

void loop() {
  // put your main code here, to run repeatedly:
  float innerTemperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure();
  Serial.print("Temperature = ");
  Serial.print(innerTemperature);
  Serial.println(" *C");

  HTTPClient http;
  String serverPath = "http://192.168.1.13:3030/temp";
  http.begin(serverPath.c_str());
  int httpResponseCode = http.GET();

  String outerTemperature = "0";
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    outerTemperature = http.getString();
    Serial.println(outerTemperature);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  http.end();

  serverPath = "http://192.168.1.13:3030/isLedActive?room=" + room;
  http.begin(serverPath.c_str());
  httpResponseCode = http.GET();

  String ledIsActive = "true";
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    ledIsActive = http.getString();
    Serial.println(ledIsActive);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }
  http.end();
  
  if (ledIsActive == "true") {
    if (outerTemperature.toFloat() > innerTemperature + 1) {
      Serial.println("No Lüfting");
      digitalWrite(14, LOW);
      digitalWrite(15, HIGH);
      digitalWrite(16, HIGH);
    } else if (outerTemperature.toFloat() < innerTemperature -1) {
      Serial.println("Lüfting");
      digitalWrite(14, HIGH);
      digitalWrite(15, LOW);
      digitalWrite(16, HIGH);
    } else {
      Serial.println("Maybe Lüfting");
      digitalWrite(14, LOW);
      digitalWrite(15, LOW);
      digitalWrite(16, HIGH);
    }
  } else {
    Serial.println("LED is not active");
    digitalWrite(14, HIGH);
    digitalWrite(15, HIGH);
    digitalWrite(16, HIGH);
  }

  delay(10000);
}
