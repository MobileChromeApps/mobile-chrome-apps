/*
 *
 * Copyright 2013 Anis Kadri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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

#ifndef CPPTL_JSON_FEATURES_H_INCLUDED
# define CPPTL_JSON_FEATURES_H_INCLUDED

# include "forwards.h"

namespace Json {

   /** \brief Configuration passed to reader and writer.
    * This configuration object can be used to force the Reader or Writer
    * to behave in a standard conforming way.
    */
   class JSON_API Features
   {
   public:
      /** \brief A configuration that allows all features and assumes all strings are UTF-8.
       * - C & C++ comments are allowed
       * - Root object can be any JSON value
       * - Assumes Value strings are encoded in UTF-8
       */
      static Features all();

      /** \brief A configuration that is strictly compatible with the JSON specification.
       * - Comments are forbidden.
       * - Root object must be either an array or an object value.
       * - Assumes Value strings are encoded in UTF-8
       */
      static Features strictMode();

      /** \brief Initialize the configuration like JsonConfig::allFeatures;
       */
      Features();

      /// \c true if comments are allowed. Default: \c true.
      bool allowComments_;

      /// \c true if root must be either an array or an object value. Default: \c false.
      bool strictRoot_;
   };

} // namespace Json

#endif // CPPTL_JSON_FEATURES_H_INCLUDED
