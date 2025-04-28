/*

Understanding Add method

      -> const jobStr = JSON.stringify(job);
              -> serializing the job object because redis stores
                 strings and numbers only

      -> if (job.delayUntil > now) {
                await redis.zadd(this.delayedKey, job.delayUntil, jobStr);
         }
            
            -> checking if the job is scheduled for later 
               and if yes then store it in delayed queue

               else store it in waiting queue


*/

/*

Understanding get method

const isPaused = await redis.get(this.pauseKey);
if (isPaused) return null;

       -> if the queue is paused,then return null means the queue 
          has no need to return any job for now

       -> If pause flag is set, we don't allow workers to take any jobs.
       -> Because maybe admin wants to temporarily stop processing — for 
          maintenance, for scaling, or safety.

       -> This makes pause/resume behavior very clean and centralized.

const now = Date.now();
const dueJobs = await redis.zrangebyscore(this.delayedKey, 0, now);

       -> now we are taking all jobs from delayed queue whose delay
          time is set till now


for (const jobStr of dueJobs) {
const job = JSON.parse(jobStr);
await redis.zadd(this.waitingKey, job.priority, jobStr);
await redis.zrem(this.delayedKey, jobStr);
}
        -> now for every delayed ready jobs,we 
               1. Deserialize the job.
               2. Add it into the waiting queue, sorted by priority.
               3. Remove it from delayed queue.



const jobs = await redis.zrange(this.waitingKey, 0, 0);
        -> now we are getting the job with highest priority
        -> start=0 and end=0 means we just want 1 job at a time
        

const jobStr = jobs[0];
const job = JSON.parse(jobStr);

await redis.zrem(this.waitingKey, jobStr);
await redis.zadd(this.activeKey, Date.now(), jobStr);

return job;
   
       -> first we parse the job which we get from waiting queue to json
       -> then we will return the job from waiting queue
       -> and then we will add this job to active queue 
              -> this is important because as of now,this job is not 
                 processed and so we need to keep this job in account
                 until is is completed or failed
       -> lastly we will return the job so that worker can work on it.
*/

/*

Understanding complete method

In Complete method we do very simple things
first,we remove the job from the active queue which is completed
and then add the current job in complete queue(for monitoring purpose
     as it keep the list of completed jobs )

And at last,we are publishing the message so that other service can know
that the job is completed


*/

/*

Understanding fail method


job.attempts -= 1;
        -> since the job comes to this method, this job failed and so we need
           to decrease the value of attempt property by one.

await redis.zrem(this.activeKey, jobStr);
        -> and we also remove this method from the active queue 

if (job.attempts > 0) {
      const newJobStr = JSON.stringify(job);
      await redis.zadd(this.waitingKey, job.priority, newJobStr);
}
       -> if attempts is left for this job then put it in waiting queue

now if the attempt is left for the job,then we put it into two queue,
first, we put it into dead queue and also in failed queue , and why we
are putting it into two queue because dead queue keep track of jobs 
which are failed to complete and putting it in failed queue for same
purpose(and in our queue till version 2 there is no diffrence,but later
we will understand and implement where both serve diffrent purpose)

And at last we will publish a event about a dead job






*/

/*

Understanding Pause method
       -> just making pause flag active by stting 1 so that no queue
          job will be taken out for now


Understanding resume method
       -> just delete the pause key so that queue can resume working



*/

/*

Understanding SubscribeToEven method
         -> This function is simple in a sense that complete and fail method
          publish some message and this method used to listen them and
          passed it to a handler which application devloper pass so that they 
          know about the event 

*/

/*

Understanding cleanUp things
         -> queue constructor call the startCleanup method which
         periodically calls cleanOldJObs which goes through diffrent
         queue like completed queeue,failed queue,dead queue and 
         delete all the jobs whose ttl is expired


*/
