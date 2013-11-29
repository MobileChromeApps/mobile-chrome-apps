#!/bin/bash

testdir=`pwd`
cd xlocalize
../../bin/xlocalize.js -t es,pt,it,fr
test1=`diff translations.json ../xlocalize.testfile1.json`
if [ "$test1" = "" ]
then
	cd subdir
	test2=`diff translations.json ../../xlocalize.testfile2.json`
	if [ "$test2" = "" ]
	then
		cd ..
		../../bin/xlocalize.js -t es,pt,it,fr,sr
		test3=`diff translations.json ../xlocalize.testfile3.json`
		if [ "$test3" = "" ]
		then
			cd subdir
			test4=`diff translations.json ../../xlocalize.testfile4.json`
			if [ "$test4" = "" ]
			then
				echo "Success"
			else
				echo "testfile4 Failed";
			fi
		else
			echo "testfile3 Failed";
		fi
	else
		echo "testfile2 Failed";
	fi
else
	echo "testfile1 Failed";
fi
cd $testdir
rm xlocalize/translations.json
rm xlocalize/subdir/translations.json
