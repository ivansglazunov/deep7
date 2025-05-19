import dotenv from 'dotenv';
import { down } from '../../lib/down-links';

// Load environment variables from root .env file
dotenv.config();

// Run the migration
down(); 