//Select your modem
//SSL/TLS is currently supported only with SIM8xx series
#define TINY_GSM_MODEM_SIM800

//Increase RX buffer
#define TINY_GSM_RX_BUFFER 256

#include <TinyGsmClient.h> //https://github.com/vshymanskyy/TinyGSM
#include <ArduinoHttpClient.h> //https://github.com/arduino-libraries/ArduinoHttpClient
#include <ArduinoJson.h>
#include <TimeLib.h>

const char FIREBASE_HOST[]  = "";
const String FIREBASE_AUTH  = "";
const String FIREBASE_PATH  = "/";
const String CMD_URL = "/command";
const int SSL_PORT          = 443;
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

#define DEBUG
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
void debugPrintFunc(int level, String func, int line, String  &msg) {
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

// Your GPRS credentials
// Leave empty, if missing user or pass
char apn[]  = "airtelgprs.com";
char user[] = "";
char pass[] = "";

//GSM Module RX pin to ESP32 2
//GSM Module TX pin to ESP32 4
#define rxPin 4
#define txPin 2
HardwareSerial sim800(1);
#define TINY_GSM_DEBUG Serial
//#define DUMP_AT_COMMANDS
#ifdef DUMP_AT_COMMANDS
  #include <StreamDebugger.h>
  StreamDebugger debugger(sim800, Serial);
  TinyGsm modem(debugger);
#else
  TinyGsm modem(sim800);
#endif


TinyGsmClientSecure gsm_client_secure_modem(modem, 0);
HttpClient http_client = HttpClient(gsm_client_secure_modem, FIREBASE_HOST, SSL_PORT);

unsigned long previousMilli;
long interval = 10000;

//**************************************************************************************************
void setup() {
  Serial.begin(115200);
  debugPrintln(INFO, "ESP32 Begin setup");

  sim800.begin(115200, SERIAL_8N1, rxPin, txPin);
  debugPrintln(INFO, "SIM800L serial initialize");

  //Restart takes quite some time
  //To skip it, call init() instead of restart()
  String modemInfo = modem.getModemInfo();
  debugPrint(INFO, "Modem Info before restart: ");
  debugPrintln(NONE, modemInfo);
  
  debugPrintln(INFO, "Initializing modem...");
  modem.restart();
  modemInfo = modem.getModemInfo();
  debugPrint(INFO, "Modem Info after restart: ");
  debugPrintln(NONE, modemInfo);
  
  // Unlock your SIM card with a PIN
  modem.simUnlock("0000");

  sysStatus.motorState = OFF;
  sysStatus.powerState = ON;

  
  http_client.setHttpResponseTimeout(90 * 1000); //^0 secs timeout
  debugPrintln(INFO, "Setup completed");


}
//**************************************************************************************************


//**************************************************************************************************
void loop() {

  debugPrint(INFO, "Connecting to ");
  debugPrintln(NONE, apn);
  if (!modem.gprsConnect(apn, user, pass)) {
    debugPrintln(ERR, " GPRS connection failed");
    delay(1000);
    return;
  }
  debugPrintln(INFO, "GPRS connection successful");
  
  http_client.connect(FIREBASE_HOST, SSL_PORT);
  if (http_client.connected()) {
      debugPrint(INFO, "Connected to ");
      debugPrintln(NONE, FIREBASE_HOST);
      http_client.connectionKeepAlive();
  }
  
  while (true) {
    if (!http_client.connected()) {
      debugPrintln(NONE,"");
      http_client.stop();// Shutdown
      debugPrintln(ERR, "HTTP  not connected");
      break;
    }
    else{
      handleCmdRequests(&http_client);
      delay(5000);
    }
  }
}
//**************************************************************************************************

//**************************************************************************************************
bool readFromFirebase(String &response, const String & path , HttpClient* http) {
  int statusCode = 0;
  
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  String url;
  if (path[0] != '/') {
    url = "/";
  }
  url += path + ".json";
  url += "?auth=" + FIREBASE_AUTH;
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  
  String contentType = "application/json";
  http->get(url);
  
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  // read the status code and body of the response
  //statusCode-200 (OK) | statusCode -3 (TimeOut)
  statusCode = http->responseStatusCode();
  if (statusCode != 200) {
    debugPrint(ERR, "HTTPS Request failed. Status code: ");
    debugPrintln(NONE, statusCode);
    return false;
  }
  response = http->responseBody();
  return true;
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
}
void postToFirebase( const String & path , const String & data, HttpClient* http) {
  String response;
  int statusCode = 0;
  
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  String url;
  if (path[0] != '/') {
    url = "/";
  }
  url += path + ".json";
  url += "?auth=" + FIREBASE_AUTH;
  Serial.print("POST:");
  Serial.println(url);
  Serial.print("Data:");
  Serial.println(data);
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  
  String contentType = "application/json";
  http->put(url, contentType, data);
  
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  // read the status code and body of the response
  //statusCode-200 (OK) | statusCode -3 (TimeOut)
  statusCode = http->responseStatusCode();
  if (statusCode == 200) {
    response = http->responseBody();
    Serial.print("Response: ");
    Serial.println(response);
  } else {
    debugPrint(ERR, "HTTPS Request failed. Status code: ");
    debugPrintln(NONE, statusCode);
  }
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN

  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  if (!http->connected()) {
    Serial.println();
    http->stop();// Shutdown
    Serial.println("HTTP POST disconnected");
  }
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
}
long getServerTimeStamp(HttpClient* http){

  String response;
  String data("{\".sv\":\"timestamp\"}");
  int statusCode = 0;
  long timestamp = 0;

  String url("/timestamp.json?auth=");
  url += FIREBASE_AUTH;
  
  String contentType = "application/json";
  http->put(url, contentType, data);
  
  // read the status code and body of the response
  //statusCode-200 (OK) | statusCode -3 (TimeOut)
  statusCode = http->responseStatusCode();
  if (statusCode == 200) {
    response = http->responseBody();
    debugPrintln(INFO, "Response: ");
    debugPrintln(INFO, response);
                              
    timestamp = getTimeStamp(response);
    debugPrint(INFO, "timestamp obtained : ");
    debugPrintln(NONE, timestamp);
  } else {
    debugPrint(ERR, "HTTPS Request failed. Status code: ");
    debugPrintln(NONE, statusCode);
  }
  if (!http->connected()) {
    Serial.println();
    http->stop();// Shutdown
    debugPrintln(INFO, "HTTP POST disconnected");
  } 
  return timestamp;
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


void updateSystemStatus(HttpClient *http){
    
  String url("/systemStatus");

  String jsonData = "{"
    "\"motorState\":<motorState>,"
    "\"powerState\":<powerState>,"
    "\"timestamp\":{\".sv\":\"timestamp\"}"
  "}";

  jsonData.replace("<motorState>",String(sysStatus.motorState));
  jsonData.replace("<powerState>",String(sysStatus.powerState));

  postToFirebase(url, jsonData, http);
}
void turnOnMotor(HttpClient *http){
  delay(100);
  debugPrintln(INFO, "Motor successfully turned on");
  sysStatus.motorState = ON;
  updateSystemStatus(http);
}

void turnOffMotor(HttpClient *http){
  delay(100);
  debugPrintln(INFO, "Motor successfully turned off");
  sysStatus.motorState = OFF;
  updateSystemStatus(http);
}

void handleCmdRequests(HttpClient *http){
  DynamicJsonDocument jsonCmd(256);
  String strCmd;
  const char *request = NULL;
  
  if (!getCommand(strCmd, jsonCmd, http)) {
    debugPrintln(INFO, "Failed to read firebase db for command requests");
    return;
  }
  request = jsonCmd["request"];
  if (strcmp(request,"prepareStart") == 0) {
    handleMotorStart(strCmd, http);
  }
  if (strcmp(request,"stop") == 0) {
    handleMotorStop(strCmd, http);
  }
  if (strcmp(request,"updateSystemStatus") == 0) {
    handleUpdateSystemStatus(strCmd,http);
  }
  
}
void handleMotorStart(const String &strCmd, HttpClient *http){
  long currentServerTimestamp = 0;
  long requestTimestamp = 0;
  String confirmCmd;
  DynamicJsonDocument jsonCmd(256);
  const char *request = NULL;
  int retryCount = 0;

  requestTimestamp = getTimeStamp1(strCmd);
  currentServerTimestamp = getServerTimeStamp(http);
  if ((currentServerTimestamp - requestTimestamp) <= CMD_REQUEST_TIMEOUT){
    String jsonData = "{"
        "\"request\":\"\","
        "\"response\":\"ready\","
        "\"timestamp\":{\".sv\":\"timestamp\"}"
      "}";

    postToFirebase(CMD_URL,jsonData, http);
    while (true){
      delay(CMD_CONFIRMATION_DELAY);      
      if (!getCommand(confirmCmd, jsonCmd, http)) {
        debugPrintln(INFO, "Failed to read firebase db while waiting for confirmStart");
        break;
      }
      request = jsonCmd["request"];
      if (strcmp(request,"confirmStart") == 0) {
        turnOnMotor(http);
        break ;

      }
      retryCount ++;
      debugPrint(INFO, "Confirmstart retryCount : ");
      debugPrintln(NONE, retryCount);
      if (retryCount > 30){
        debugPrintln(INFO, "Reached maximum retry for confirm start");
        break;
      }
    }

  }
}

void handleMotorStop(const String &strCmd, HttpClient *http){
  long currentServerTimestamp = 0;
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);
  currentServerTimestamp = getServerTimeStamp(http);

  if ((currentServerTimestamp - requestTimestamp) <= CMD_REQUEST_TIMEOUT){
    turnOffMotor(http);
    String jsonData = "{"
        "\"request\":\"\","
        "\"response\":\"stopped\","
        "\"timestamp\":{\".sv\":\"timestamp\"}"
      "}";

    postToFirebase(CMD_URL,jsonData, http);
  }
}

bool getCommand(String &strCmd, DynamicJsonDocument &jsonCmd, HttpClient *http){
  char cmd[200];
  if (!readFromFirebase(strCmd, CMD_URL, http)) {
    return false;
  }
  debugPrintln(INFO, strCmd);
  strCmd.toCharArray(cmd, 200);
  deserializeJson(jsonCmd, cmd);  
  return true;
}
void handleUpdateSystemStatus(const String &strCmd,HttpClient *http){ 
  long requestTimestamp = 0;

  requestTimestamp = getTimeStamp1(strCmd);

  if(requestTimestamp == lastSystemUpdateTimestamp){
    return;
  }
  lastSystemUpdateTimestamp = requestTimestamp;
  updateSystemStatus(http);
}


//**************************************************************************************************