#!/bin/bash

# First run npm install and wait till it is finished
npm install
wait

# Execute node init.js and wait till it is finished (to init the opensearch index)
# node src/init.js
# wait

# Set the number of threads to use for the libuv thread pool
export UV_THREADPOOL_SIZE=16

# Number of processes to run in parallel
X=3

# Set the start and end day numbers (inclusive)
YEAR=2025
MONTH=09
START_DAY=19
END_DAY=22

# Command to run the Node.js script
# NODE_COMMAND="node --max-old-space-size=16384 src/indexAccessLogs.js --day="
NODE_COMMAND="node --max-old-space-size=8192 src/accessLogsToCsv.js --year=$YEAR --month=$MONTH --day="

# Array to hold process IDs
PIDS=()

# Day counter
DAY_COUNTER=$START_DAY

# Function to start a new process
start_new_process() {
  # Stop if we've passed the end day
  if [ $DAY_COUNTER -gt $END_DAY ]; then
    echo "All days processed. Exiting."
    exit 0
  fi

  # Format the day number to always be two digits
  DAY_NUMBER=$(printf "%02d" $DAY_COUNTER)

  # Append the day number to the Node.js command
  FULL_COMMAND="$NODE_COMMAND$DAY_NUMBER"

  # Start the process in the background
  $FULL_COMMAND &
  PID=$!
  echo "Started process with PID: $PID and DAY_NUMBER: $DAY_NUMBER"
  PIDS+=($PID)
  
  # Increment the day counter
  DAY_COUNTER=$((DAY_COUNTER + 1))
}

# Start initial processes
for ((i=0; i<X; i++)); do
  start_new_process
done

# Monitor processes
while true; do
  for PID in "${PIDS[@]}"; do
    if ! kill -0 $PID 2>/dev/null; then
      echo "Process with PID: $PID finished"
      # Remove finished process from array
      PIDS=(${PIDS[@]/$PID})
      # Start a new process
      start_new_process
    fi
  done
  # Sleep for a short interval before checking again
  sleep 1
done