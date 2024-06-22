# Use an official Node runtime as a parent image
FROM registry.access.redhat.com/ubi9/nodejs-20


USER 1001
# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the current directory contents into the container at /usr/src/app
COPY --chown=1001:0 ./ ./

# Install any needed packages specified in package.json
RUN npm ci

# Make port 80 available to the world outside this container
EXPOSE 80

# Run app.js when the container launches
CMD ["node", "app.js"]
