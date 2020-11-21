const path = require("path");
const ErrorResponse = require("../utils/errorResponse");
const Bootcamp = require("../models/Bootcamps");
const geocoder = require("../utils/geocoder");

exports.getBootcamps = async (req, res, next) => {
  res.status(200).json(res.advancedResults);
};
exports.getBootcamp = async (req, res, next) => {
  try {
    const bootcamp = await Bootcamp.findById(req.params.id);
    if (!bootcamp) {
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404);
    }
    res.status(200).json({ success: true, data: bootcamp });
  } catch (err) {
    // res.status(400).json({ success: false });
    next(err);
  }
};

exports.createBootcamp = async (req, res, next) => {
  try {
    req.body.user=req.user.id;
    // Check for published bootcamp
    const publishedBootcamp=await Bootcamp.findOne({user:req.user.id});
    // If the use is not admin , they can only add one bootcamp

    if(publishedBootcamp && req.user.role !=="admin"){
      return next(new ErrorResponse(`The user with ID ${req.user.id} has already published a bootcamp`,400))
    }

    const bootcamp = await Bootcamp.create(req.body);
    res.status(201).json({
      success: true,
      data: bootcamp,
    });
  } catch (err) {
    next(err);
  }
};
exports.updateBootcamp = async (req, res, next) => {
  try {
    let bootcamp = await Bootcamp.findById(req.params.id);
    if (!bootcamp) {
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404);
    }
    // Make sure user is bootcamp owner

    if(bootcamp.user.toString()!==req.user.id && res.user.role !=="admin"){
      return next(
        new ErrorResponse(`User ${req.params.id} is not uthorized to update this bootcamp`,401)
      )
    }
    bootcamp = await Bootcamp.findOneAndUpdate(rew.params.id, req.body, {
      new: true,
      runValidatios: true,
    });
    res.status(200).json({ success: true, data: bootcamp });
  } catch (err) {
    next(err);
  }
};

exports.deleteBootcamp = async (req, res, next) => {
  try {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
      return next(
        new ErrorResponse(`User ${req.params.id} is not authorized to delete this bootcamp`, 404)
      );
    }
    bootcamp.remove();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

exports.getBootcampsInRadius = async (req, res, next) => {
  const { zipcode, distance } = req.params;

  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  const radius = distance / 3963;

  try {
    const bootcamps = await Bootcamp.find({
      location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
    });

    if (!bootcamps) {
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404);
    }
    res
      .status(200)
      .json({ success: true, count: bootcamps.length, data: bootcamps });
  } catch (err) {
    next(err);
  }
};

exports.bootcampPhotoUpload = async (req, res, next) => {
  try {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
      return next(
        new ErrorResponse(
          `Bootcamp not  found with id of ${req.params.id}`,
          404
        )
      );
    }

    if (!req.files) {
      return next(new ErrorResponse(`Please upload a file`, 400));
    }
    const file = req.files.file;
    if (!file.mimetype.startsWith("image")) {
      return next(new ErrorResponse(`Please upload an image file`, 400));
    }
    if (file.size > process.env.MAX_FILE_UPLOAD) {
      return next(
        new ErrorResponse(
          `Please upload an image less  than ${process.env.MAX_FILE_UPLOAD}`,
          400
        )
      );
    }
    file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;
    file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
      if (err) {
        console.error(err);
        return next(new ErrorResponse(`Problem with file upload`, 500));
      }
      await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });
      res.status(200).json({
        success: true,
        data: file.name,
      });
    });
  } catch (err) {
    next(err);
  }
};
