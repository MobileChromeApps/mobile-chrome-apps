/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/


#include <../public/json/reader.h>
#include <string>
#include <sstream>
#include <sys/stat.h>
#include <sys/types.h>
#include <stdio.h>
#include <stdlib.h>
#include "echo.hpp"

using namespace std;

/**
 * Default constructor.
 */
Echo::Echo(const std::string& id) : m_id(id) {
}

/**
 * Memory destructor.
 */
Echo::~Echo() {
}

/**
 * This method returns the list of objects implemented by this native
 * extension.
 */
char* onGetObjList() {
    static char name[] = "Echo";
    return name;
}

/**
 * This method is used by JNext to instantiate the Memory object when
 * an object is created on the JavaScript server side.
 */
JSExt* onCreateObject(const string& className, const string& id) {
    if (className == "Echo") {
        return new Echo(id);
    }

    return NULL;
}

/**
 * Method used by JNext to determine if the object can be deleted.
 */
bool Echo::CanDelete() {
    return true;
}

/**
 * It will be called from JNext JavaScript side with passed string.
 * This method implements the interface for the JavaScript to native binding
 * for invoking native code. This method is triggered when JNext.invoke is
 * called on the JavaScript side with this native objects id.
 */
string Echo::InvokeMethod(const string& command) {
    int index = command.find_first_of(" ");
    std::string method = command.substr(0, index);
    
    // read in arguments
    Json::Value obj;
    if (static_cast<int>(command.length()) > index && index != -1) {
        std::string jsonObject = command.substr(index + 1, command.length());
        Json::Reader reader;

        bool parse = reader.parse(jsonObject, obj);
        if (!parse) {
            fprintf(stderr, "%s", "error parsing\n");
            return "Cannot parse JSON object";
        }
    }    
    
    // Determine which function should be executed
    if (method == "doEcho") {
        std::string message = obj["message"].asString();
        if(message.length() > 0) {
            return doEcho(message);
        }else{
             return doEcho("Nothing to echo.");
        }
    }else{
        return doEcho("Unsupported Method");
    }
}

/**
 * Method that sends off Event message
 */
string Echo::doEcho(const std::string& message) {
    std::string eventString = m_id;
    eventString.append(" ");
    eventString.append("cordova.echo.callback");
    eventString.append(" ");
    eventString.append(message);
    SendPluginEvent(eventString.c_str(), m_pContext);
    return eventString;
}
