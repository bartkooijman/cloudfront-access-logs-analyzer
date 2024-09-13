#!/bin/bash

# Get the process IDs of all processes triggered by run.sh
pids=$(pgrep -f "run.sh")

# Check if any processes are running
if [ -z "$pids" ]; then
  echo "No processes triggered by run.sh are running."
else
  # Stop each process
  for pid in $pids; do
    kill "$pid"
  done
  echo "Stopped all processes triggered by run.sh."
fi
# Get the process IDs of all node.js processes triggered by index.js
node_pids=$(pgrep -f "index.js --day=")

# Check if any node.js processes are running
if [ -z "$node_pids" ]; then
  echo "No node.js processes triggered by index.js are running."
else
  # Stop each node.js process
  for node_pid in $node_pids; do
    kill "$node_pid"
  done
  echo "Stopped all node.js processes triggered by index.js."
fi