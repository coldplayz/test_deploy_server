/* eslint-disable no-await-in-loop */
const House = require('../models/House');
const Agent = require('../models/Agent');
const Tenant = require('../models/Tenant');
const { bookHouseQueue } = require('../jobs/queue');

class HouseController {
  /**
   * Create a new house entry with the provided details.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   */
  static async postHouse(req, res) {
    try {
      // Check if user is authenticated
      if (!req.user) return res.status(401).json({ error: 'You need to log in' });

      // Check if user is an agent
      const { listings } = req.user;
      if (!listings) return res.status(401).json({ error: 'Must be an agent to post a house' });

      const agentId = req.user._id;
      // Extract the required properties from the request body.
      const {
        country,
        state,
        city,
        description,
        price,
        numFloors,
        numRooms,
        numBathrooms,
        numToilets,
        shared,
        water,
        electricity,
        name,
        address,
        houseType,
      } = req.body;

//      console.log('req body: ', req.body);

      // Extract paths to coverImage and optional images array
      const coverImage = `http://${req.get('host')}/${req.files.coverImage[0].filename}`;
      if (!coverImage) {
        return res
          .status(400)
          .json({ success: false, message: 'coverImage required' });
      }

      const images = req.files.images?.map((file) => `http://${req.get('host')}/${file.filename}`);

      // const agentId = req.user._id;

      // Create a new house object with the extracted data.
      const newHouse = {
        agentId,
        location: { country: country.trim(), state: state.trim(), city: city.trim() },
        coverImage,
        images,
        description,
        price,
        numFloors,
        numRooms,
        numBathrooms,
        numToilets,
        shared,
        water,
        electricity,
        name,
        address,
        houseType,
      };

      // Create the new house entry in the database.
      const house = new House(newHouse);
      const result = await house.save();

      // Add the house to agent.listings
      const updateOptions = { $push: { listings: result._id } };
      await Agent.findByIdAndUpdate(agentId, updateOptions);
      return res.status(201).json({ success: true, message: 'House successfuly added to listings' });
    } catch (err) {
      // If an error occurs during house creation, return a JSON response with a 400 status code
      // and the error message.
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Get a list of houses based on the specified parameters.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   * @returns {Promise} - A Promise that resolves to the JSON result or rejects with an error.
   */
  static async getHouse(req, res) {
    try {
      const pageSize = parseInt(req.query.pageSize, 10) || 10; // Default page size is 10
      const pageNumber = parseInt(req.query.pageNumber, 10) || 1; // Default page number is 1

      // Calculate the number of documents to skip based on the page size and number
      const skip = (pageNumber - 1) * pageSize;

      // Initialize an empty object to store query parameters for filtering houses.
      const params = {};

      // Define an array of parameter names that represent numerical values.
      const numericalParamters = [
        'numRooms',
        'numFloors',
        'numBathrooms',
        'numToilets',
        'minPrice',
        'maxPrice',
      ];
      const agentParameters = ['agentFirstname', 'agentLastname'];

      // Define an array of parameter names that represent attributes of
      // the location object in the database.
      const locationParamters = ['country', 'state', 'city'];

      for (const key of Object.keys(req.query)) {
        // Check if agent parameters are part of the filter parameters
        const { agentFirstname, agentLastname } = req.query;
        if (agentFirstname && agentLastname) {
          const agent = await Agent.findOne({
            firstName: agentFirstname.trim(),
            lastName: agentLastname.trim(),
          });
          const agentId = agent?._id;
          params.agentId = agentId;
        }

        // If it's a location parameter, add it to the 'location' property of the 'params' object.
        if (locationParamters.includes(key)) {
          params[`location.${key}`] = req.query[key];
        }

        // If it's a numerical parameter, parse the value to an integer
        // and add it to the 'params' object.
        if (numericalParamters.includes(key)) {
          // If both minPrice and maxPrice are provided
          if ('minPrice' in req.query && 'maxPrice' in req.query) {
            // If both are equal, houses with exact price match is return
            if (req.query.minPrice === req.query.maxPrice) {
              params.price = parseInt(req.query.minPrice, 10);
            } else {
              // Houses with price range from minPrice - maxPrice are returned
              params.price = {
                $gte: req.query.minPrice,
                $lte: req.query.minPrice,
              };
            }
          } else if (key === 'minPrice') {
            params.price = { $gte: req.query[key] };
          } else if (key === 'maxPrice') {
            params.price = { $lte: req.query[key] };
          } else {
            params[key] = parseInt(req.query[key], 10);
          }
        }
        if (![...agentParameters, ...locationParamters, ...numericalParamters, 'pageNumber', 'pageSize'].includes(key)) {
          params[key] = req.query[key];
        }
      }

      // Implement pagination
      const count = await House.countDocuments(params);
      console.log(count)
      const totalPages = Math.ceil(count / pageSize);

      console.log(params)
      const result = await House.find(params)
        .skip(skip)
        .limit(pageSize);

      return res.status(200).json({
        data: result,
        totalPages,
        totalCount: count,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Delete a house entry based on the provided ID.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   */
  static async deleteHouse(req, res) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      // Check if authenicated user is an agent
      const { listings } = req.user;
      if (!listings) return res.status(401).json({ error: 'Must be an agent to delete a house' });
      const { houseId } = req.params;

      // Find and delete the house entry in the database with the provided ID.
      await House.findByIdAndDelete(houseId);
      return res.status(200).json({ success: true, message: 'House successfully deleted' });
    } catch (err) {
      // If an error occurs during house deletion, return a JSON response with
      // a 400 status code and the error message.
      return res.status(400).json({ error: err.message });
    }
  }

  /**
   * Updates an existing house entry in the database.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  static async updateHouse(req, res) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      // Check if user is an agent
      const { listings } = req.user;
      if (!listings) return res.status(401).json({ error: 'Must be an agent to post a house' });
      const { houseId } = req.params;

      const {
        country,
        state,
        city,
        description,
        price,
        numFloors,
        numRooms,
        numBathrooms,
        numToilets,
        shared,
        water,
        electricity,
        name,
        address,
        houseType,
      } = req.body;

      // Extract image paths.
      const coverImage = `http://${req.get('host')}/${req.files.coverImage[0].filename}`;
      if (!coverImage) {
        return res
          .status(400)
          .json({ success: false, message: 'coverImage required' });
      }
      const images = req.files.images?.map((file) => `http://${req.get('host')}/${file.filename}`);

      // Create an object with the properties to be updated in the database.
      const updateObject = {
        location: { country: country.trim(), state: state.trim(), city: city.trim() },
        description,
        price,
        numFloors,
        numRooms,
        numBathrooms,
        numToilets,
        shared,
        water,
        electricity,
        name,
        address,
        houseType,
        coverImage,
        images,
      };

      // Find the existing house by ID and update it with the new data.
      const existingHouse = await House.findByIdAndUpdate(
        houseId,
        updateObject,
        { new: true }, // Return the updated house after the update is applied.
      );

      // If the house doesn't exist, return a 404 response.
      if (!existingHouse) {
        return res
          .status(404)
          .json({ success: false, message: 'House not found' });
      }

      return res.status(200).json({ success: true, message: 'House updated' });
    } catch (err) {
      console.log(err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Books a house for inspection by sending email to tenant and agent
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  static async bookHouse(req, res) {
    try {
      // Check if the user is logged in
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
      // Extract house id from request params
      const { houseId } = req.params;
      if (!houseId) return res.status(400).json({ success: false, message: 'HouseId required' });

      // Get house with the id
      const house = await House.findById(houseId);
      if (!house) return res.status(404).json({ success: false, message: 'No house found' });

      // Extract necessary information from the house
      const { agentId, description, address } = house;
      // Create a job data to send mail
      console.log(req.user);
      const bookingJobData = {
        agentId,
        tenantId: req.user._id,
        houseAddress: address,
        houseDescription: description,
      };

      // create a Queue and queue in the job data
      const job = await bookHouseQueue.add(bookingJobData);
      await job.finished();

      // Add house to users cart
      // Add the house to agent.listings
      const updateOptions = { $push: { cart: houseId } };
      await Tenant.findByIdAndUpdate(req.user._id, updateOptions);
      return res.status(200).json({ success: true, message: 'Appointment booked' });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

   /**
   * Serves image files (coverImage and images) to users 
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   */
  static async getImages(req, res) {
    const houseId = req.params.id;
    if (!houseId) return res.status(400).json({success: false, message: 'Missing house id'})
    const house = await House.findById(houseId);
    
    if (!house) {
      return res.status(404).send('House not found');
    }
    
    // Check if the request includes the 'coverImage' parameter
    if (req.query.coverImage) return res.sendFile(house.coverImage);
    
    // Check if the request includes the 'images' parameter
    if (req.query.images) {
      
      // Set the response headers to force a download
      res.set('Content-Type', 'application/octet-stream');
      res.set('Content-Disposition', 'attachment; filename="images.zip"');

      // Iterate over the image paths and initiate the download for each file
      house.images.forEach(imagePath => {
        res.download(imagePath);
      });

      return;
  }
  
  // Return a default response if the 'images' query parameter is not provided
  res.status(400).send('Invalid request');
  }
}

module.exports = HouseController;
