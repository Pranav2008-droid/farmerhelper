
#include <ArduinoJson.h>
#include <WiFi.h>
#include <IOXhop_FirebaseESP32.h>
#include <HTTPClient.h>

#define FIREBASE_HOST ""
#define FIREBASE_AUTH ""
#define WIFI_SSID ""
#define WIFI_PASSWORD ""

const String CMD_URL = "/command";
const String TMSTAMP_URL = "/timestamp";

long lastSystemUpdateTimestamp = 0;

#define ON 1
#define OFF 0
#define CMD_REQUEST_TIMEOUT 30
#define CMD_CONFIRMATION_DELAY 1000

struct __SystemStatus{
  int motorState;
  int powerState;
};
typedef struct __SystemStatus SystemStatus;

SystemStatus sysStatus;

#define INFO 0
#define ERR 1
#define NONE 10

//#define DEBUG
#ifdef DEBUG
void debugPrintFuncBase(int level, String func, int line) {
    if (level != NONE) {
      Serial.print(func);
      Serial.print("():");
      Serial.print(line);
      Serial.print(": ");
      if (level == ERR) {
        Serial.print("ERR: ");
      }
      if (level == INFO) {
        Serial.print("INFO: ");
      }
    }
}
void debugPrintFunc(int level, String func, int line, const char * msg) {
    debugPrintFuncBase(level, func, line);
    Serial.print(msg);
}
void debugPrintFunc(int level, String func, int line, long int msg) {
    debugPrintFuncBase(level, func, line);
    Serial.print(msg);
}
void debugPrintFunc(int level, String func, int line, int msg) {
    debugPrintFuncBase(level, func, line);
    Serial.print(msg);
}
void debugPrintFunc(int level, String func, int line, const String  &msg) {
  debugPrintFunc(level, func, line, msg.c_str());
}  
#define debugPrint(level, msg) debugPrintFunc(level, __FUNCTION__, __LINE__, msg)
#define debugPrintln(level, msg) \
  debugPrintFunc(level, __FUNCTION__, __LINE__, msg); \
  Serial.print("\n");
#else
#define debugPrint(level, msg)
#define debugPrintln(level, msg)
#endif

long getServerTimeStamp(){

  HTTPClient http;
  String response;
  String data("{\".sv\":\"timestamp\"}");
  String url = "";

  int statusCode = 0;
  long timeStamp = 0;

 	http.addHeader("Content-Type", "application/json");

  url += "https://";
  url += FIREBASE_HOST;
  url += "/timestamp.json?auth=";
  url += FIREBASE_AUTH;
  
  http.begin(url);

  statusCode = http.PUT(data);
  if (statusCode != HTTP_CODE_OK) {
    debugPrint(ERR, "Error while writing timestamp to firebase. Error code: ");
    debugPrintln(NONE, statusCode);
    debugPrint(NONE, "Error text: ");
    debugPrintln(NONE, http.errorToString(statusCode));
    goto out;
  }

  response = http.getString();

  debugPrintln(INFO, "Response = " + response);

  timeStamp = getTimeStamp(response);

out:
  return timeStamp;
}
/*
 * Function to get the timestamp in seconds from the value retrieved from firebase
 * 10 digits next to : in the string considered as timestamp. For example, if the input str is
 * "{\"timestamp\":1234567890123}", then the timestamp returend will be 1234567890
 * 
 * Firebase stores timestamp in milliseconds. To store milliseconds we need 64 bit variable.
 * ESP32 supports only 32bit integer. Hence this function ignores milliseconds part.
 */
long getTimeStamp(const String &str) {
  int timestampValStart = str.indexOf(":") + 1;
  String timestampStr = str.substring(timestampValStart,timestampValStart + 10);
  return timestampStr.toInt();
}
long getTimeStamp1(const String &str) {
  int timestampValStart = str.indexOf("timestamp\":") + 11;
  String timestampStr = str.substring(timestampValStart,timestampValStart + 10);  
  return timestampStr.toInt();
}

void postToFirebase( const String & path , const String & data) {
  HTTPClient http;
  String response;
  int statusCode;
  String url = "";

 	http.addHeader("Content-Type", "application/json");

  url += "https://";
  url += FIREBASE_HOST;
  url += "/" + path + ".json?auth=";
  url += FIREBASE_AUTH;
  http.begin(url);

  debugPrintln(INFO, "Data: " + data);

  statusCode = http.PUT(data);
  if (statusCode != HTTP_CODE_OK) {
    debugPrint(ERR, "Error while writing data to firebase. Error code: ");
    debugPrint(NONE, statusCode);
    debugPrint(NONE, "Error text: ");
    debugPrintln(NONE, http.errorToString(statusCode));
    debugPrintln(NONE, "Data: " + data);
  } else {
    debugPrintln(INFO, "Posted data to firebase successfully.");
  }

}
void prepareMotorStart(const String &strCmd){
  long currentServerTimestamp = 0;
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);
  currentServerTimestamp = getServerTimeStamp();
  if ((currentServerTimestamp - requestTimestamp) <= CMD_REQUEST_TIMEOUT){
    String jsonData = "{"
        "\"request\":\"\","
        "\"response\":\"ready\","
        "\"timestamp\":{\".sv\":\"timestamp\"}"
      "}";

    postToFirebase(CMD_URL, jsonData);
  } else {
    debugPrint(INFO, "Skipping stale prepare start request. Requested time: ");
    debugPrint(NONE, (currentServerTimestamp - requestTimestamp));
    debugPrintln(NONE, " sec ago");
  }
}
void updateSystemStatus(){
    
  String url("/systemStatus");

  String jsonData = "{"
    "\"motorState\":<motorState>,"
    "\"powerState\":<powerState>,"
    "\"timestamp\":{\".sv\":\"timestamp\"}"
  "}";

  jsonData.replace("<motorState>",String(sysStatus.motorState));
  jsonData.replace("<powerState>",String(sysStatus.powerState));

  postToFirebase(url, jsonData);
}
void turnOnMotor(){
  if (sysStatus.motorState != ON) {
    sysStatus.motorState = ON;
    String jsonData = "{"
        "\"request\":\"\","
        "\"response\":\"turnedon\","
        "\"timestamp\":{\".sv\":\"timestamp\"}"
      "}";

    postToFirebase(CMD_URL,jsonData);
    updateSystemStatus();
    debugPrintln(INFO, "Motor successfully turned on");
  } else {
    debugPrintln(INFO, "Motor is already on");
  }
}

void turnOffMotor(){
  if (sysStatus.motorState != OFF) {
    sysStatus.motorState = OFF;
    String jsonData = "{"
        "\"request\":\"\","
        "\"response\":\"stopped\","
        "\"timestamp\":{\".sv\":\"timestamp\"}"
      "}";
    postToFirebase(CMD_URL,jsonData);
    updateSystemStatus();    
    debugPrintln(INFO, "Motor successfully turned off");
  } else {
    debugPrintln(INFO, "Motor is already off");
  }
}

void confirmMotorStart(const String &strCmd){
  long currentServerTimestamp = 0;
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);
  currentServerTimestamp = getServerTimeStamp();
  if ((currentServerTimestamp - requestTimestamp) <= CMD_REQUEST_TIMEOUT){
    turnOnMotor();
  } else {
    debugPrint(INFO, "Skipping stale confirm start request. Requested time: ");
    debugPrint(NONE, (currentServerTimestamp - requestTimestamp));
    debugPrintln(NONE, " sec ago");
  }
}

void handleMotorStop(const String &strCmd){
  long currentServerTimestamp = 0;
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);
  currentServerTimestamp = getServerTimeStamp();

  if ((currentServerTimestamp - requestTimestamp) <= CMD_REQUEST_TIMEOUT){
    turnOffMotor();
  } else {
    debugPrint(INFO, "Skipping stale stop request. Requested time: ");
    debugPrint(NONE, (currentServerTimestamp - requestTimestamp));
    debugPrintln(NONE, " sec ago");
  }
}

void handleUpdateSystemStatus(const String &strCmd){ 
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);

  if(requestTimestamp == lastSystemUpdateTimestamp){
    return;
  }
  lastSystemUpdateTimestamp = requestTimestamp;
  updateSystemStatus();
}

void handleCmdRequests(String &strCmd)
{

  StaticJsonBuffer<1024> jsonBuffer;
  String request = "";
  JsonObject &root = jsonBuffer.parseObject(strCmd);
  if (root.success()) {
    if (root.containsKey("request")) {
      request = root["request"].as<String>();
    }
  }

  if (request.length() > 0) {
    debugPrintln(INFO, "request = " + request);
  }
  if (request.equals("prepareStart")) {
   prepareMotorStart(strCmd);
  }
  if (request.equals("confirmStart")) {
    confirmMotorStart(strCmd);
  }
  if (request.equals("stop")) {
    handleMotorStop(strCmd);
  }
  if (request.equals("updateSystemStatus")) {
    handleUpdateSystemStatus(strCmd);
  }
}


//**************************************************************************************************
void setup() {
  Serial.begin(9600);
  debugPrintln(INFO, "ESP32 Begin setup");

  sysStatus.motorState = OFF;
  sysStatus.powerState = ON;

  // connect to wifi.
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  debugPrint(INFO, "Connecting to WIFI...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  debugPrintln(NONE, "Connected ");
  debugPrintln(INFO, WiFi.localIP().toString());
  
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.stream("/command", [](FirebaseStream stream) {
    String eventType = stream.getEvent();
    eventType.toLowerCase();
     
    debugPrint(INFO, "Stream Event:");
    debugPrintln(NONE, eventType);

    if (eventType == "put") {
      String path = stream.getPath();
      String data = stream.getDataString();

      debugPrint(INFO, "Stream Event Path:");
      debugPrintln(NONE, path);

      debugPrint(INFO, "Stream Event Data:");
      debugPrintln(NONE, data);

      handleCmdRequests(data);
    }
  });    
  //TODO: Write data in firebase realtime db about the startup
  debugPrintln(INFO, "Setup completed");

}
//**************************************************************************************************


//**************************************************************************************************
void loop() {
  delay(5000);
}
//**************************************************************************************************
