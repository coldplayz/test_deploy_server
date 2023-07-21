#!/usr/bin/env bash
# Automated fix for corrupted cache

OUT="$(npm cache verify 2>&1)"
exitCode=$(echo "$?")

runs=0

while [[ exitCode -eq 254 ]]
do
  PTH=$(echo "$OUT" | grep "path .*" | awk '{print $4}')
  # echo $?
  echo "$PTH"
  touch "$PTH"
  echo "#########"
  runs=$((runs + 1))
  echo "NUMBER OF TOUCHES: $runs"
  echo "#########"
  OUT="$(npm cache verify 2>&1)"
  exitCode=$(echo "$?")
done
