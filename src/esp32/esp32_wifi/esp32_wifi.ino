#include <ArduinoJson.h>
#include <WiFi.h>
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

#if CONFIG_FREERTOS_UNICORE
#define ARDUINO_RUNNING_CORE 0
#else
#define ARDUINO_RUNNING_CORE 1
#endif

#define FIREBASE_HOST ""
#define FIREBASE_AUTH ""
#define WIFI_SSID "AgriAutomation"
#define WIFI_PASSWORD ""

const String CMD_URL = "/command";
const String TMSTAMP_URL = "/timestamp";
const String STARTUP_URL = "/startup";
const String SYS_STATUS_URL = "/systemStatus";

#define ON 1
#define OFF 0

#define CMD_REQUEST_TIMEOUT 30 // Seconds
#define WIFI_RECONNECT_INTERVAL 30000 //Milliseconds
#define FSTREAM_KEEP_ALIVE_INTERVAL 30000 //Milliseconds
#define HARDRESTART_TIMEOUT 1800000 //30 Minutes in milliseconds
#define FIREBASE_STREAM_STACK_SIZE 16384
#define STREAM_JSON_BUFFER_SIZE 1024
#define STREAM_JSON_DATA_BUFFER_SIZE 1024
#define HEAP_MIN_THRESHOLD 100000 // If the heap size goes below this limit, board is rebooted
#define MAX_MOTOR_RUN_TIME 240 //4 hours
#define SYS_STATUS_BUF_SIZE 1024

#ifdef DEBUG1
#define WIFI_CONNECT_WAIT_TIME 1 //Seconds
#define SYSTEM_STATUS_UPDATE_INTERVAL 20000 //milliseconds
#else
#define WIFI_CONNECT_WAIT_TIME 90 //Seconds
#define SYSTEM_STATUS_UPDATE_INTERVAL 180000 //3 Minutes in milliseconds
#endif

#define RELAY 2

typedef struct __State {
  short state;
  /* Specifies the duration of the current state */
  short durationInThisState;
  unsigned long motorStateChangeTime; 
} State;
typedef struct __MotorState {
  State motorState;
  /* Specifies scheduled run time */
  short runSchedule;
  /*
   * Specifies the motor runtime.
   * Note:- When the motor state is off, then this specifies the
   * last running duration of the motor.
   */
  short runTime;
} MotorState;

typedef struct __SystemStatus {
  MotorState motor;
  State power;
} SystemStatus;

SystemStatus sysStatus;
HTTPClient http;
HTTPClient firebaseHttpStream;
WiFiClient *firebaseStreamSocket;
TaskHandle_t firebaseStreamTaskHandle;

unsigned long lastWifiReconnectTime = 0;
unsigned long lastSystemUpdateReqTimestamp = 0;
unsigned long lastSystemStatusUpdateTime = 0;
unsigned long lastFStreamKeepAliveTime = 0;

String getUrl(String path) {
  String url = "";

  url += "https://";
  url += FIREBASE_HOST;
  url += "/" + path + ".json?auth=";
  url += FIREBASE_AUTH;
  
  return url;
}
bool readFromFirebase(const String & path, String &response) {
  int statusCode = 0;
  bool result = false;
  String url = getUrl(path);

  String contentType = "application/json";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");  
  statusCode = http.GET();
  if (statusCode != HTTP_CODE_OK) {
    debugPrint(ERR, "Error while reading from firebase. Error code: ");
    debugPrint(NONE, statusCode);
    debugPrint(NONE, " Error text: ");
    debugPrintln(NONE, http.errorToString(statusCode));
    debugPrintln(NONE, "Path: " + url);
    result = false;
  } else {
    response = http.getString();
    result = true;
  }
  http.end();
  return result;
}
void firebaseStreamCallback(String &event, String &data)
{
    String path;
    StaticJsonBuffer<STREAM_JSON_BUFFER_SIZE> jsonBuffer;
    JsonObject &root = jsonBuffer.parseObject(data);
    if (root.success()) {
      if (root.containsKey("path") && root.containsKey("data")) {
        path = root["path"].as<String>();
        data = root["data"].as<String>();
      }
    }

    unsigned long currentMillis = millis();
    lastFStreamKeepAliveTime = currentMillis;

    event.toLowerCase();

    debugPrint(INFO, "Stream Event:");
    debugPrintln(NONE, event);

    if (event == "put") {
      debugPrint(INFO, "Stream Event Path:");
      debugPrintln(NONE, path);
      debugPrintln(NONE, data);

      handleCmdRequests(data);
    }
    if (event == "keep-alive") {
      if ((currentMillis - lastSystemStatusUpdateTime) >= SYSTEM_STATUS_UPDATE_INTERVAL) {
        updateSystemStatus();
      }
    }
}
void initFirebaseStream() {

    xTaskCreatePinnedToCore([](void* param) {
    String event;
    String data;
        for (;;) {
            delay(5); // Disable WDT
                
            if (!firebaseHttpStream.connected()) {
                firebaseHttpStream.end();
                firebaseHttpStream.begin(getUrl(CMD_URL));
                firebaseHttpStream.setTimeout(5000);
                firebaseHttpStream.addHeader("Accept", "text/event-stream");
                int httpCode = firebaseHttpStream.GET();
                if (httpCode != HTTP_CODE_OK) {
                    Serial.println("Error !, Firebase stream fail: " + String(httpCode));
                    delay(5000);
                    continue;
                }
                firebaseStreamSocket = firebaseHttpStream.getStreamPtr();
            }
            
            if (!firebaseStreamSocket) continue;
            
            if (firebaseStreamSocket->available()) {
                String line = firebaseStreamSocket->readStringUntil('\n');
                if (line.startsWith("event:")) {
                    event = line.substring(7, line.length());
                    event.trim();
                } else if (line.startsWith("data:")) {
                    data = line.substring(6, line.length());
                    data.trim();
                } else if (line.length() == 0) {
                    firebaseStreamCallback(event, data);
                }
            }
        }
        vTaskDelete(NULL);
        firebaseStreamTaskHandle = NULL;
    }, "FirebaseStream_Task", FIREBASE_STREAM_STACK_SIZE, NULL, 3, &firebaseStreamTaskHandle, ARDUINO_RUNNING_CORE);
    return;
}

void stopFirebaseStream() {
    if (firebaseStreamTaskHandle) vTaskDelete(firebaseStreamTaskHandle);
    if (firebaseHttpStream.connected()) {
        firebaseHttpStream.end();
    }
}
long getServerTimeStamp(){

  String response;
  String data("{\".sv\":\"timestamp\"}");
  String url = "";

  int statusCode = 0;
  long timeStamp = 0;

  url += "https://";
  url += FIREBASE_HOST;
  url += "/timestamp.json?auth=";
  url += FIREBASE_AUTH;
  
  http.begin(url);

  http.addHeader("Content-Type", "application/json");

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
  http.end();
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

  url += "https://";
  url += FIREBASE_HOST;
  url += "/" + path + ".json?auth=";
  url += FIREBASE_AUTH;
  http.begin(url);

  http.addHeader("Content-Type", "application/json");

  debugPrintln(INFO, "Data: " + data);

  statusCode = http.PUT(data);
  if (statusCode != HTTP_CODE_OK) {
    debugPrint(ERR, "Error while writing data to firebase. Error code: ");
    debugPrint(NONE, statusCode);
    debugPrint(NONE, " Error text: ");
    debugPrintln(NONE, http.errorToString(statusCode));
    debugPrintln(NONE, "Data: " + data);
  } else {
    debugPrintln(INFO, "Posted data to firebase successfully.");
    result = true;
  }
  http.end();
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
    
  String jsonData = "{"
    "\"motorState\":{"
        "\"runTime\":<runTime>,"
        "\"runSchedule\":<runSchedule>,"
        "\"state\":<motorState>,"
        "\"durationInThisState\":<durationInThisState>"
    "},"
    "\"powerState\":<powerState>,"
    "\"timestamp\":{\".sv\":\"timestamp\"}"
  "}";

  jsonData.replace("<runTime>",String(sysStatus.motor.runTime));
  jsonData.replace("<runSchedule>",String(sysStatus.motor.runSchedule));
  jsonData.replace("<motorState>",String(sysStatus.motor.motorState.state));
  jsonData.replace("<durationInThisState>",String(sysStatus.motor.motorState.durationInThisState));
  jsonData.replace("<powerState>",String(sysStatus.power.state));

  if (postToFirebase(SYS_STATUS_URL, jsonData)) {
    lastSystemStatusUpdateTime = millis();
  }
}
void turnOnMotor(){
  if (sysStatus.motor.motorState.state == ON) {
    debugPrintln(INFO, "Motor is already on");
  }
  sysStatus.motor.motorState.state = ON;
  sysStatus.motor.motorState.durationInThisState = 0;
  sysStatus.motor.runTime = 0;
  sysStatus.motor.motorState.motorStateChangeTime = millis();

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
  if (sysStatus.motor.motorState.state == OFF) {
    debugPrintln(INFO, "Motor is already off");
  }
  sysStatus.motor.motorState.state = OFF;
  sysStatus.motor.motorState.durationInThisState = 0;
  sysStatus.motor.motorState.motorStateChangeTime = millis();

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
void confirmMotorStart(const String &strCmd, JsonObject &jsonCmd) {
  long currentServerTimestamp = 0;
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);
  currentServerTimestamp = getServerTimeStamp();
  if (jsonCmd.containsKey("runSchedule")) {
    sysStatus.motor.runSchedule = jsonCmd["runSchedule"].as<unsigned short>();
    debugPrint(INFO, "sysStatus.motor.runSchedule = ");
    debugPrintln(NONE, sysStatus.motor.runSchedule);
  }
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
    confirmMotorStart(strCmd, root);
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

/* void initFirebaseStream()
{
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.stream("/command", firebaseStreamCallback);
  lastFStreamKeepAliveTime = millis();
} 
void stopFirebaseStream()
{
  Firebase.stopStream();
}*/
void initHttpClient()
{
  http.setReuse(true);
}

void initializeSystemStatus() {

  String response;
  StaticJsonBuffer<STREAM_JSON_BUFFER_SIZE> jsonBuffer;

  sysStatus.motor.runSchedule = 0;
  sysStatus.motor.runTime = 0;
  sysStatus.motor.motorState.state = OFF;
  sysStatus.motor.motorState.durationInThisState = 0;
  sysStatus.power.state = ON;

  /*
   * Read status from firebase. We need to retain the last known runSchdule and runTime
   * This is needed to show the use about the remaining schedule time in case if the
   * motor is turned off due to power outage or esp32 reboot.
   */
  if (readFromFirebase(SYS_STATUS_URL, response)) {
    debugPrint(INFO, "System status read from firestore: ");
    debugPrintln(NONE, response);
    JsonObject &root = jsonBuffer.parseObject(response);
    if (root.success()) {
      if (root.containsKey("motorState")) {
        JsonObject &motorState = root["motorState"].as<JsonObject>();
        sysStatus.motor.runSchedule = motorState["runTime"].as<unsigned short>();
        sysStatus.motor.runTime = motorState["runSchedule"].as<unsigned short>();
        debugPrint(INFO, "motor.runSchedule = ");
        debugPrintln(NONE, sysStatus.motor.runSchedule);
        debugPrint(INFO, "motor.runTime = ");
        debugPrintln(NONE, sysStatus.motor.runTime);
      }
    }
  }

}
void setup() {
  int count = WIFI_CONNECT_WAIT_TIME;
  Serial.begin(115200);
  debugPrintln(INFO, "ESP32 Begin setup");
  
  pinMode(RELAY, OUTPUT);
  digitalWrite(RELAY, HIGH);

  sysStatus.motor.motorState.state = OFF;
  sysStatus.power.state = ON;

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

  initializeSystemStatus();

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
  int count = 0;
  bool reconnectWifi = false;
  unsigned long currentMillis = millis();


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
    lastWifiReconnectTime = millis();
    lastFStreamKeepAliveTime = lastWifiReconnectTime;
  }
}
void updateLocalSystemStatus() {
  bool updateSysStatusToServer = false;
  unsigned long currentMillis = millis();
  sysStatus.motor.motorState.durationInThisState = 
            (currentMillis - sysStatus.motor.motorState.motorStateChangeTime)/1000/60;
  debugPrint(INFO, "Motor State = ");
  debugPrintln(NONE, sysStatus.motor.motorState.state);
  debugPrint(INFO, "durationInThisState = ");
  debugPrintln(NONE, sysStatus.motor.motorState.durationInThisState);

  if (sysStatus.motor.motorState.state == ON) {
    if (sysStatus.motor.runTime == 0 && 
      sysStatus.motor.motorState.durationInThisState == 1 &&
      sysStatus.motor.runSchedule == 0) {
        /*
         * Update the motor status to firebase if 1 minute is elapsed
         * since motor was on.
         * This will help the mobile app to show how long the motor has
         * been running. 
         * This is needed only for non-scheduled run.
         */
        updateSysStatusToServer = true;
    }
    sysStatus.motor.runTime = sysStatus.motor.motorState.durationInThisState;
    if (updateSysStatusToServer) {
      updateSystemStatus();
    }
    /*
    * Turn off the motor if the scheduled time is elapsed or 
    * MAX_MOTOR_RUN_TIME is elapsed.
    */
    if ((sysStatus.motor.runSchedule > 0 && 
          sysStatus.motor.runTime >= sysStatus.motor.runSchedule) ||
        sysStatus.motor.runTime >= MAX_MOTOR_RUN_TIME) {
        turnOffMotor();
    }
  }

}
void loop() {
  unsigned long currentMillis = millis();
  checkStatus();
  updateLocalSystemStatus();
  delay(3000);
  debugPrint(INFO, "Heap = ");
  debugPrintln(NONE, (long)ESP.getFreeHeap());
  if (ESP.getFreeHeap() < HEAP_MIN_THRESHOLD) {
    debugPrintln(INFO, "Heap is low. Restarting.. ");
    ESP.restart();
  }
}
