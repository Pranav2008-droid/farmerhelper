//Select your modem
//SSL/TLS is currently supported only with SIM8xx series
#define TINY_GSM_MODEM_SIM800

//Increase RX buffer
#define TINY_GSM_RX_BUFFER 256

#include <TinyGsmClient.h> //https://github.com/vshymanskyy/TinyGSM
#include <ArduinoHttpClient.h> //https://github.com/arduino-libraries/ArduinoHttpClient
#include <ArduinoJson.h>
#include <TimeLib.h>

const char FIREBASE_HOST[]  = "myhost";
const String FIREBASE_AUTH  = "myauth";
  const String FIREBASE_PATH  = "/";
const int SSL_PORT          = 443;

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
// #define DUMP_AT_COMMANDS
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
  
  while (true) {
    if (!http_client.connected()) {
      debugPrintln(NONE,"");
      http_client.stop();// Shutdown
      debugPrintln(ERR, "HTTP  not connected");
      break;
    }
    else{
      debugPrint(INFO, "Connected to ");
      debugPrintln(NONE, FIREBASE_HOST);
      getServerTimeStamp(&http_client);
      delay(15000);
    }
  }
}
//**************************************************************************************************

//**************************************************************************************************
void ReadFromFirebase(const char* method, const String & path , const String & data, HttpClient* http) {
  String response;
  int statusCode = 0;
  http->connectionKeepAlive(); // Currently, this is needed for HTTPS
  
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
  http->get(url);
  
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  // read the status code and body of the response
  //statusCode-200 (OK) | statusCode -3 (TimeOut)
  statusCode = http->responseStatusCode();
  Serial.print("Status code: ");
  Serial.println(statusCode);
  response = http->responseBody();
  Serial.print("Response: ");
  Serial.println(response);
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN

  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  if (!http->connected()) {
    Serial.println();
    http->stop();// Shutdown
    Serial.println("HTTP POST disconnected");
  }
  //NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
}
void PostToFirebase(const char* method, const String & path , const String & data, HttpClient* http) {
  String response;
  int statusCode = 0;
  http->connectionKeepAlive(); // Currently, this is needed for HTTPS
  
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
  Serial.print("Status code: ");
  Serial.println(statusCode);
  response = http->responseBody();
  Serial.print("Response: ");
  Serial.println(response);
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
  String data("{\"timestamp\":{\".sv\":\"timestamp\"}}");
  int statusCode = 0;
  long timestamp = 0;

  http->connectionKeepAlive(); // Currently, this is needed for HTTPS
  
  String url("/.json?auth=");
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
//**************************************************************************************************
