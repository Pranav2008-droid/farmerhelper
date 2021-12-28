
#include <ArduinoJson.h>
#include <WiFi.h>
#include <IOXhop_FirebaseESP32.h>
#include <HTTPClient.h>
#include <ESP32Ping.h>

#define INFO 0
#define ERR 1
#define NONE 10

#define DEBUG
#ifdef DEBUG
void debugPrintFuncBase(int level, String func, int line) {
    if (level != NONE) {
      Serial.print("[");
      Serial.print(millis());
      Serial.print("]");
      Serial.print(":");
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

#define FIREBASE_HOST "farmerhelper-70abb.firebaseio.com"
#define FIREBASE_AUTH ""
#define WIFI_SSID "AgriAutomation"
#define WIFI_PASSWORD ""

const String CMD_URL = "/command";
const String TMSTAMP_URL = "/timestamp";
const String STARTUP_URL = "/startup";

#define ON 1
#define OFF 0

#define CMD_REQUEST_TIMEOUT 30 // Seconds
#define WIFI_RECONNECT_INTERVAL 30000 //Milliseconds
#define FSTREAM_KEEP_ALIVE_INTERVAL 30000 //Milliseconds
#define HARDRESTART_TIMEOUT 1800000 //30 Minutes in milliseconds

#ifdef DEBUG
#define WIFI_CONNECT_WAIT_TIME 1 //Seconds
#define SYSTEM_STATUS_UPDATE_INTERVAL 20000 //milliseconds
#else
#define WIFI_CONNECT_WAIT_TIME 90 //Seconds
#define SYSTEM_STATUS_UPDATE_INTERVAL 180000 //3 Minutes in milliseconds
#endif

#define RELAY 2

struct __SystemStatus{
  int motorState;
  int powerState;
};
typedef struct __SystemStatus SystemStatus;

SystemStatus sysStatus;
HTTPClient http;
unsigned long lastWifiReconnectTime = 0;
unsigned long lastSystemUpdateReqTimestamp = 0;
unsigned long lastSystemStatusUpdateTime = 0;
unsigned long lastFStreamKeepAliveTime = 0;

long getServerTimeStamp(){

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
bool postToFirebase( const String & path , const String & data) {
  String response;
  int statusCode;
  String url = "";
  bool result = false;

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
    result = true;
  }
  return result;
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

  if (postToFirebase(url, jsonData)) {
    lastSystemStatusUpdateTime = millis();
  }
}
void turnOnMotor(){
  if (sysStatus.motorState == ON) {
    debugPrintln(INFO, "Motor is already on");
  }
  sysStatus.motorState = ON;
  digitalWrite(RELAY, LOW);
  updateSystemStatus();
  String jsonData = "{"
      "\"request\":\"\","
      "\"response\":\"turnedon\","
      "\"timestamp\":{\".sv\":\"timestamp\"}"
    "}";

  postToFirebase(CMD_URL,jsonData);
  debugPrintln(INFO, "Motor successfully turned on");
}
void turnOffMotor(){
  if (sysStatus.motorState == OFF) {
    debugPrintln(INFO, "Motor is already off");
  }
  sysStatus.motorState = OFF;
  digitalWrite(RELAY,HIGH);
  updateSystemStatus();    
  String jsonData = "{"
      "\"request\":\"\","
      "\"response\":\"stopped\","
      "\"timestamp\":{\".sv\":\"timestamp\"}"
    "}";
  postToFirebase(CMD_URL,jsonData);
  debugPrintln(INFO, "Motor successfully turned off");
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
  //long currentServerTimestamp = 0;
  //long requestTimestamp = 0;

  //requestTimestamp = getTimeStamp1(strCmd);
  //currentServerTimestamp = getServerTimeStamp();

  //if ((currentServerTimestamp - requestTimestamp) <= CMD_REQUEST_TIMEOUT){
    turnOffMotor();
  /*} else {
    debugPrint(INFO, "Skipping stale stop request. Requested time: ");
    debugPrint(NONE, (currentServerTimestamp - requestTimestamp));
    debugPrintln(NONE, " sec ago");
  }*/
}
void handleUpdateSystemStatus(const String &strCmd){ 
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);

  if(requestTimestamp == lastSystemUpdateReqTimestamp){
    return;
  }
  lastSystemUpdateReqTimestamp = requestTimestamp;
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
    /*
     * The system status is updated periodically (for every 3 min) as part of
     * firebase stream keep alive call.
     * 
     * So ignoring system status command request. This should ideally be disabled
     * from mobile app.
     */
    //handleUpdateSystemStatus(strCmd);
  }
}
void firebaseStreamCallback(FirebaseStream stream)
{
    String eventType = stream.getEvent();
    unsigned long currentMillis = millis();
    lastFStreamKeepAliveTime = currentMillis;

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
    if (eventType == "keep-alive") {
      if ((currentMillis - lastSystemStatusUpdateTime) >= SYSTEM_STATUS_UPDATE_INTERVAL) {
        updateSystemStatus();
      }
    }
}
void initFirebaseStream()
{
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.stream("/command", firebaseStreamCallback);
  lastFStreamKeepAliveTime = millis();
}
void stopFirebaseStream()
{
  Firebase.stopStream();
}
void initHttpClient()
{
  http.setReuse(true);
}
void uninitHttpClient()
{
  http.end();
}

void setup() {
  int count = WIFI_CONNECT_WAIT_TIME;
  Serial.begin(115200);
  debugPrintln(INFO, "ESP32 Begin setup");
  
  pinMode(RELAY, OUTPUT);
  digitalWrite(RELAY, HIGH);

  sysStatus.motorState = OFF;
  sysStatus.powerState = ON;

  //Wait for 70 seconds for wifi to be available
  /* debugPrintln(INFO, "Waiting for 90 seconds for wifi to be available...");
  while (count-- > 0) {
    delay(1000);
    debugPrint(INFO, count);
    debugPrintln(NONE, " seconds remaining");
  }
  */
  // connect to wifi.
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  debugPrint(INFO, "Connecting to WIFI...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  debugPrintln(NONE, "Connected ");
  debugPrintln(INFO, "IP: " + WiFi.localIP().toString());

  delay(5000);

  debugPrintln(INFO, "Checking if firebase host is reachable...");
  while(!Ping.ping(FIREBASE_HOST)) {
    debugPrint(ERR, "Unable to reach ");
    debugPrint (NONE, FIREBASE_HOST);
    debugPrintln(NONE, ". Will retry in 10 sec");
    delay(10000);
  }
  debugPrintln(INFO, "Success.");

  initHttpClient();

  updateSystemStatus();    

  String jsonData = "{"
      "\"request\":\"\","
      "\"response\":\"stopped\","
      "\"timestamp\":{\".sv\":\"timestamp\"}"
    "}";
  postToFirebase(CMD_URL,jsonData);

  /* 
   * Keep firebase stream init after postToFirebase for CMD_URL.
   * otherwise stream will be called unnecessarily for the above 
   * firebase update.
   */
  initFirebaseStream();

  String startupData = "{"
      "\"timestamp\":{\".sv\":\"timestamp\"}"
    "}";
  postToFirebase(STARTUP_URL, startupData);

  debugPrintln(INFO, "Setup completed");

}
void checkStatus()
{
  unsigned long currentMillis = millis();
  int count = 0;
  bool reconnectWifi = false;


  if ((currentMillis - lastWifiReconnectTime) < WIFI_RECONNECT_INTERVAL) {
    /*
     * If last wifi reconnect time is less than WIFI_RECONNECT_INTERVAL
     * there is nothing todo even if wifi is disconnected.
     * 
     * Note that Firebase stream reinit is also results in wifi reconnect.
     * Hence we dont have to check for Firebase stream reinit interval.
     */
    return;
  }

  if ((currentMillis - lastFStreamKeepAliveTime) >= HARDRESTART_TIMEOUT || 
      (currentMillis - lastSystemStatusUpdateTime) >= HARDRESTART_TIMEOUT) {
    /*
     * If last keep alive was HARDRESTART_TIMEOUT ago, even reconnecting wifi did not
     * help. So lets restart the board.
     * 
     * (or)
     * 
     * If the last system status update was HARDRESTART_TIMEOUT ago, there might be something
     * wrong in communicating with firebase. So lets restart the board so that there is a 
     * possibility that the error state is recovered.
     *
     * Note that if the motor is on, it will be turned off during restart
     */
    ESP.restart();
    return;
  }
  // if WiFi is down, try reconnecting
  if ((WiFi.status() != WL_CONNECTED)) {
    debugPrintln(INFO, "Wifi is not connected. Reconnecting WiFi...");
    reconnectWifi = true;
  } else if ((currentMillis - lastFStreamKeepAliveTime) > (FSTREAM_KEEP_ALIVE_INTERVAL*3)) {
    /*
    * Check if firebase stream is active.
    *
    * Stream keep alive happens for every 30 seconds (FSTREAM_KEEP_ALIVE_INTERVAL).
    * Lets consider stream is not active if keep alive did not happen for more than
    * 3 times FSTREAM_KEEP_ALIVE_INTERVAL.
    *
    * Steam may be not alive due to wifi. So lets restart wifi as well.
    */
    reconnectWifi = true;
    debugPrintln(INFO, "Firebase stream is not active. Reconnecting WiFi...");
  }
  
  if (reconnectWifi) {
    debugPrintln(INFO, "Uninitialize http");
    uninitHttpClient();
    debugPrintln(INFO, "Stop firebase stream before wifi reconnect");
    stopFirebaseStream();
    debugPrintln(INFO, "Disconect wifi before reconnect");
    WiFi.disconnect();
    debugPrint(INFO, "Reconnecting WiFi...");
    WiFi.reconnect();
    count = 0;
    while (WiFi.status() != WL_CONNECTED && count < 60) {
      delay(1000);
      count++;
    }
    debugPrintln(NONE, "connected");
    debugPrintln(INFO, "IP: " + WiFi.localIP().toString());
    if (WiFi.status() == WL_CONNECTED)  {
      debugPrintln(INFO, "Checking if firebase host is reachable...");
      while(!Ping.ping(FIREBASE_HOST)) {
        debugPrint(ERR, "Unable to reach ");
        debugPrint (NONE, FIREBASE_HOST);
        debugPrintln(NONE, ". Will retry in 10 sec");
        delay(10000);
      }
      debugPrintln(INFO, "Success.");
      initHttpClient();
      initFirebaseStream();
    }
    lastWifiReconnectTime = currentMillis;
  }
}
void loop() {
  checkStatus();
  delay(500);
}
